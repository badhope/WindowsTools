//! Service Control Manager wrapper, using direct advapi32 FFI to avoid
//! the `windows` crate's awkward generated bindings for these old APIs.

use serde::{Deserialize, Serialize};
use std::ffi::c_void;
use wt_core::{Error, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRow {
    pub name: String,
    pub display: String,
    pub status: String,
    pub start_type: String,
    pub pid: u32,
    pub can_stop: bool,
    pub can_pause: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub start_type: String,
    pub description: String,
}

type ScHandle = *mut c_void;

// ENUM_SERVICE_STATUS_PROCESSW
// NOTE: lpServiceName/lpDisplayName are *pointers* to wide strings that
// live AFTER the array of structs in the same buffer.
#[repr(C)]
struct EnumServiceStatusProcessW {
    lp_service_name: *const u16,
    lp_display_name: *const u16,
    status: ServiceStatusProcess,
}

#[repr(C)]
#[derive(Default, Clone, Copy)]
struct ServiceStatusProcess {
    dw_service_type: u32,
    dw_current_state: u32,
    dw_controlsAccepted: u32,
    dw_win32_exit_code: u32,
    dw_service_specific_exit_code: u32,
    dw_check_point: u32,
    dw_wait_hint: u32,
    dw_process_id: u32,
    dw_service_flags: u32,
}

// LPQUERY_SERVICE_CONFIGW
// All `lp*` fields are pointers to wide strings that live AFTER this struct
// in the same buffer (the API puts the variable-length strings at the end).
#[repr(C)]
struct QueryServiceConfigW {
    dw_service_type: u32,
    dw_start_type: u32,
    dw_error_control: u32,
    lp_binary_path_name: *const u16,
    lp_load_order_group: *const u16,
    dw_tag_id: u32,
    lp_dependencies: *const u16,
    lp_service_start_name: *const u16,
    lp_display_name: *const u16,
}

#[repr(C)]
struct ServiceDescriptionW {
    lp_description: *const u16,
}

#[link(name = "advapi32")]
extern "system" {
    fn OpenSCManagerW(
        lp_machine_name: *const u16,
        lp_database_name: *const u16,
        dw_desired_access: u32,
    ) -> ScHandle;
    fn CloseServiceHandle(h_sc_object: ScHandle) -> i32;
    fn OpenServiceW(h_sc_manager: ScHandle, lp_service_name: *const u16, dw_desired_access: u32) -> ScHandle;
    fn EnumServicesStatusExW(
        h_sc_manager: ScHandle,
        info_level: u32,
        dw_service_type: u32,
        dw_service_state: u32,
        lp_services: *mut u8,
        cb_buf_size: u32,
        pcb_bytes_needed: *mut u32,
        lp_services_returned: *mut u32,
        lp_resume_handle: *mut u32,
        psz_group_name: *const u16,
    ) -> i32;
    fn QueryServiceConfig2W(
        h_service: ScHandle,
        dw_info_level: u32,
        lp_buffer: *mut u8,
        cb_buf_size: u32,
        pcb_bytes_needed: *mut u32,
    ) -> i32;
    fn QueryServiceConfigW(
        h_service: ScHandle,
        lp_service_config: *mut u8,
        cb_buf_size: u32,
        pcb_bytes_needed: *mut u32,
    ) -> i32;
    fn StartServiceW(h_service: ScHandle, dw_num_service_args: u32, lp_service_arg_vectors: *const *const u16) -> i32;
    fn ControlService(h_service: ScHandle, dw_control: u32, lp_service_status: *mut ServiceStatus) -> i32;
    fn ChangeServiceConfigW(
        h_service: ScHandle,
        dw_service_type: u32,
        dw_start_type: u32,
        dw_error_control: u32,
        lp_binary_path_name: *const u16,
        lp_load_order_group: *const u16,
        lpdw_tag_id: *const u32,
        lp_dependencies: *const u16,
        lp_service_start_name: *const u16,
        lp_password: *const u16,
        lp_display_name: *const u16,
    ) -> i32;
}

#[repr(C)]
#[derive(Default)]
struct ServiceStatus {
    dw_service_type: u32,
    dw_current_state: u32,
    dw_controls_accepted: u32,
    dw_win32_exit_code: u32,
    dw_service_specific_exit_code: u32,
    dw_check_point: u32,
    dw_wait_hint: u32,
}

const SC_MANAGER_ENUMERATE_SERVICE: u32 = 0x0004;
const SC_MANAGER_CONNECT: u32 = 0x0001;
const SERVICE_QUERY_CONFIG: u32 = 0x0001;
const SERVICE_QUERY_STATUS: u32 = 0x0004;
const SERVICE_START: u32 = 0x0010;
const SERVICE_STOP: u32 = 0x0020;
const SERVICE_PAUSE_CONTINUE: u32 = 0x0040;
const SERVICE_CHANGE_CONFIG: u32 = 0x0002;
const SERVICE_QUERY_STATUS_CFG: u32 = 0x0008;
const SERVICE_CONFIG_DESCRIPTION: u32 = 1;
const SERVICE_CONFIG_START_TYPE: u32 = 0;
const SERVICE_NO_CHANGE: u32 = 0xFFFFFFFF;
const SERVICE_BOOT_START: u32 = 0;
const SERVICE_SYSTEM_START: u32 = 1;
const SERVICE_AUTO_START: u32 = 2;
const SERVICE_DEMAND_START: u32 = 3;
const SERVICE_DISABLED: u32 = 4;
const SERVICE_WIN32: u32 = 0x00000030;
const SERVICE_DRIVER: u32 = 0x0000000B;
const SERVICE_ACTIVE: u32 = 0x00000002;
const SERVICE_INACTIVE: u32 = 0x00000003;
const SC_ENUM_PROCESS_INFO: u32 = 0;
const SERVICE_CONTROL_STOP: u32 = 1;
const SERVICE_CONTROL_PAUSE: u32 = 2;
const SERVICE_CONTROL_CONTINUE: u32 = 3;

pub fn list() -> Result<Vec<ServiceRow>> {
    enumerate_then(false)
}

/// Fast list that skips the per-service `QueryServiceConfig` enrichment.
/// Safe to call from a non-elevated user context: each `EnumServicesStatusExW`
/// row is read with `SERVICE_QUERY_STATUS` only, which is granted to
/// `S-1-1-0` by default. The enriched columns (start_type, description)
/// are left blank.
pub fn list_status_only() -> Result<Vec<ServiceRow>> {
    enumerate_then(true)
}

/// Fetch the start_type and description for a single service.
/// Requires `SERVICE_QUERY_CONFIG` (admin / SYSTEM).
pub fn config_of(name: &str) -> Result<ServiceConfig> {
    unsafe {
        let scm = OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT);
        if scm.is_null() { return Err(Error::Other("OpenSCManagerW failed".into())); }
        let _g = ScmGuard(scm);
        let svc = open_service(scm, name, SERVICE_QUERY_CONFIG | SERVICE_QUERY_STATUS)?;
        let _h = ScHandleGuard(svc);

        let mut needed: u32 = 0;
        let _ = QueryServiceConfigW(svc, std::ptr::null_mut(), 0, &mut needed);
        let mut start_type = String::new();
        if needed > 0 {
            let mut buf = vec![0u8; needed as usize];
            let r = QueryServiceConfigW(svc, buf.as_mut_ptr(), needed, &mut needed);
            if r != 0 {
                let s = &*(buf.as_ptr() as *const QueryServiceConfigW);
                start_type = start_type_name(s.dw_start_type);
            }
        }

        let mut needed2: u32 = 0;
        let _ = QueryServiceConfig2W(svc, SERVICE_CONFIG_DESCRIPTION, std::ptr::null_mut(), 0, &mut needed2);
        let mut description = String::new();
        if needed2 > 0 {
            let mut buf2 = vec![0u8; needed2 as usize];
            let r = QueryServiceConfig2W(svc, SERVICE_CONFIG_DESCRIPTION, buf2.as_mut_ptr(), needed2, &mut needed2);
            if r != 0 {
                let s = &*(buf2.as_ptr() as *const ServiceDescriptionW);
                description = read_wide_ptr(s.lp_description);
            }
        }
        Ok(ServiceConfig { start_type, description })
    }
}

fn enumerate_then(skip_enrich: bool) -> Result<Vec<ServiceRow>> {
    unsafe {
        let scm = OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_ENUMERATE_SERVICE | SC_MANAGER_CONNECT);
        if scm.is_null() { return Err(Error::Other("OpenSCManagerW failed".into())); }
        let _g = ScmGuard(scm);

        let mut needed: u32 = 0;
        let mut count: u32 = 0;
        let mut resume: u32 = 0;
        let _ = EnumServicesStatusExW(
            scm, SC_ENUM_PROCESS_INFO, SERVICE_WIN32 | SERVICE_DRIVER, SERVICE_ACTIVE,
            std::ptr::null_mut(), 0, &mut needed, &mut count, &mut resume, std::ptr::null(),
        );
        if needed == 0 {
            needed = 64 * 1024;
        }
        let mut buf = vec![0u8; needed as usize];
        let r = EnumServicesStatusExW(
            scm, SC_ENUM_PROCESS_INFO, SERVICE_WIN32 | SERVICE_DRIVER, SERVICE_ACTIVE,
            buf.as_mut_ptr(), needed, &mut needed, &mut count, &mut resume, std::ptr::null(),
        );
        if r == 0 {
            return Err(Error::Other(format!("EnumServicesStatusExW failed: {}", std::io::Error::last_os_error())));
        }
        let entries = std::slice::from_raw_parts(buf.as_ptr() as *const EnumServiceStatusProcessW, count as usize);
        let mut out = Vec::with_capacity(count as usize);
        for e in entries {
            let name = read_wide_ptr(e.lp_service_name);
            out.push(ServiceRow {
                name,
                display: read_wide_ptr(e.lp_display_name),
                status: state_name(e.status.dw_current_state),
                start_type: String::new(),
                pid: e.status.dw_process_id,
                can_stop: false,
                can_pause: false,
                description: String::new(),
            });
        }
        if skip_enrich { return Ok(out); }
        // Enrich.
        for row in out.iter_mut() {
            if let Ok(svc) = open_service(scm, &row.name, SERVICE_QUERY_CONFIG | SERVICE_QUERY_STATUS | SERVICE_QUERY_STATUS_CFG) {
                let _g = ScHandleGuard(svc);
                let mut needed2: u32 = 0;
                let _ = QueryServiceConfig2W(svc, SERVICE_CONFIG_DESCRIPTION, std::ptr::null_mut(), 0, &mut needed2);
                if needed2 > 0 {
                    let mut buf2 = vec![0u8; needed2 as usize];
                    let r = QueryServiceConfig2W(svc, SERVICE_CONFIG_DESCRIPTION, buf2.as_mut_ptr(), needed2, &mut needed2);
                    if r != 0 {
                        let s = &*(buf2.as_ptr() as *const ServiceDescriptionW);
                        row.description = read_wide_ptr(s.lp_description);
                    }
                }
                let mut needed3: u32 = 0;
                let _ = QueryServiceConfigW(svc, std::ptr::null_mut(), 0, &mut needed3);
                if needed3 > 0 {
                    let mut buf3 = vec![0u8; needed3 as usize];
                    let r = QueryServiceConfigW(svc, buf3.as_mut_ptr(), needed3, &mut needed3);
                    if r != 0 {
                        let s = &*(buf3.as_ptr() as *const QueryServiceConfigW);
                        row.start_type = start_type_name(s.dw_start_type);
                    }
                }
            }
        }
        Ok(out)
    }
}

pub fn control(name: &str, action: &str) -> Result<()> {
    unsafe {
        let scm = OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT);
        if scm.is_null() { return Err(Error::Other("OpenSCManagerW failed".into())); }
        let _g = ScmGuard(scm);
        let name_w = wide_null(name);
        match action {
            "start" => {
                let svc = open_service(scm, name, SERVICE_START)?;
                let _g = ScHandleGuard(svc);
                let r = StartServiceW(svc, 0, std::ptr::null());
                if r == 0 { return Err(Error::Other(format!("StartServiceW: {}", std::io::Error::last_os_error()))); }
                Ok(())
            }
            "stop" => {
                let svc = open_service(scm, name, SERVICE_STOP)?;
                let _g = ScHandleGuard(svc);
                let mut status = ServiceStatus::default();
                let r = ControlService(svc, SERVICE_CONTROL_STOP, &mut status);
                if r == 0 { return Err(Error::Other(format!("ControlService: {}", std::io::Error::last_os_error()))); }
                Ok(())
            }
            "pause" => {
                let svc = open_service(scm, name, SERVICE_PAUSE_CONTINUE)?;
                let _g = ScHandleGuard(svc);
                let mut status = ServiceStatus::default();
                let r = ControlService(svc, SERVICE_CONTROL_PAUSE, &mut status);
                if r == 0 { return Err(Error::Other(format!("ControlService: {}", std::io::Error::last_os_error()))); }
                Ok(())
            }
            "continue" => {
                let svc = open_service(scm, name, SERVICE_PAUSE_CONTINUE)?;
                let _g = ScHandleGuard(svc);
                let mut status = ServiceStatus::default();
                let r = ControlService(svc, SERVICE_CONTROL_CONTINUE, &mut status);
                if r == 0 { return Err(Error::Other(format!("ControlService: {}", std::io::Error::last_os_error()))); }
                Ok(())
            }
            other => Err(Error::InvalidInput(format!("unknown action: {other}"))),
        }
    }
}

pub fn set_start_type(name: &str, start_type: &str) -> Result<()> {
    unsafe {
        let scm = OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT);
        if scm.is_null() { return Err(Error::Other("OpenSCManagerW failed".into())); }
        let _g = ScmGuard(scm);
        let svc = open_service(scm, name, SERVICE_CHANGE_CONFIG)?;
        let _g = ScHandleGuard(svc);
        let st = match start_type {
            "boot" => SERVICE_BOOT_START,
            "system" => SERVICE_SYSTEM_START,
            "auto" => SERVICE_AUTO_START,
            "demand" => SERVICE_DEMAND_START,
            "disabled" => SERVICE_DISABLED,
            _ => return Err(Error::InvalidInput(format!("unknown start type: {start_type}"))),
        };
        let r = ChangeServiceConfigW(
            svc, SERVICE_NO_CHANGE, st, SERVICE_NO_CHANGE,
            std::ptr::null(), std::ptr::null(), std::ptr::null(),
            std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null(),
        );
        if r == 0 { return Err(Error::Other(format!("ChangeServiceConfigW: {}", std::io::Error::last_os_error()))); }
        Ok(())
    }
}

unsafe fn open_service(scm: ScHandle, name: &str, access: u32) -> Result<ScHandle> {
    let name_w = wide_null(name);
    let svc = OpenServiceW(scm, name_w.as_ptr(), access);
    if svc.is_null() { return Err(Error::Other(format!("OpenServiceW {name}: {}", std::io::Error::last_os_error()))); }
    Ok(svc)
}

fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn read_wide(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

/// Read a null-terminated wide string from an arbitrary pointer.
/// Used to dereference `lpServiceName` / `lpDisplayName`, which point
/// into the caller's buffer.
unsafe fn read_wide_ptr(p: *const u16) -> String {
    if p.is_null() { return String::new(); }
    let mut len = 0;
    while len < 32 * 1024 && *p.add(len) != 0 {
        len += 1;
    }
    let slice = std::slice::from_raw_parts(p, len);
    String::from_utf16_lossy(slice)
}

fn state_name(state: u32) -> String {
    match state {
        1 => "STOPPED",
        2 => "START_PENDING",
        3 => "STOP_PENDING",
        4 => "RUNNING",
        5 => "CONTINUE_PENDING",
        6 => "PAUSE_PENDING",
        7 => "PAUSED",
        _ => "UNKNOWN",
    }.to_string()
}

fn start_type_name(st: u32) -> String {
    match st {
        0 => "BOOT",
        1 => "SYSTEM",
        2 => "AUTO",
        3 => "DEMAND",
        4 => "DISABLED",
        _ => "UNKNOWN",
    }.to_string()
}

struct ScmGuard(ScHandle);
impl Drop for ScmGuard { fn drop(&mut self) { unsafe { CloseServiceHandle(self.0) }; } }
struct ScHandleGuard(ScHandle);
impl Drop for ScHandleGuard { fn drop(&mut self) { unsafe { CloseServiceHandle(self.0) }; } }

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lists_services() {
        let v = list().unwrap();
        assert!(!v.is_empty());
    }
}
