//! ShellExecuteW wrapper with `runas` for per-action elevation.

use std::ffi::c_void;
use wt_core::{Error, Result};

const SE_ERR_NOERROR: u32 = 0;

#[repr(C)]
struct ShellExecuteInfoW {
    cb_size: u32,
    f_mask: u32,
    hwnd: *mut c_void,
    lp_verb: *const u16,
    lp_file: *const u16,
    lp_parameters: *const u16,
    lp_directory: *const u16,
    n_show: i32,
    h_inst_app: *mut c_void,
    lp_id_list: *mut c_void,
    lp_class: *const u16,
    hkey_class: *mut c_void,
    dw_hot_key: u32,
    h_process: *mut c_void,
    h_icon: *mut c_void,
    h_monitor: *mut c_void,
}

const SEE_MASK_NOASYNC: u32 = 0x00000100;
const SEE_MASK_NOCLOSEPROCESS: u32 = 0x00000040;

#[link(name = "shell32")]
extern "system" {
    fn ShellExecuteExW(info: *mut ShellExecuteInfoW) -> i32;
}

fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Open a file / URL with the given verb ("open", "runas", "edit", ...).
pub fn shell_execute(verb: &str, file: &str, args: Option<&str>) -> Result<u32> {
    let verb_w = wide_null(verb);
    let file_w = wide_null(file);
    let args_w = args.map(wide_null).unwrap_or_default();
    let mut info = ShellExecuteInfoW {
        cb_size: std::mem::size_of::<ShellExecuteInfoW>() as u32,
        f_mask: SEE_MASK_NOASYNC | SEE_MASK_NOCLOSEPROCESS,
        hwnd: std::ptr::null_mut(),
        lp_verb: verb_w.as_ptr(),
        lp_file: file_w.as_ptr(),
        lp_parameters: if args.is_some() { args_w.as_ptr() } else { std::ptr::null() },
        lp_directory: std::ptr::null(),
        n_show: 1, // SW_SHOWNORMAL
        h_inst_app: std::ptr::null_mut(),
        lp_id_list: std::ptr::null_mut(),
        lp_class: std::ptr::null(),
        hkey_class: std::ptr::null_mut(),
        dw_hot_key: 0,
        h_process: std::ptr::null_mut(),
        h_icon: std::ptr::null_mut(),
        h_monitor: std::ptr::null_mut(),
    };
    let r = unsafe { ShellExecuteExW(&mut info) };
    if r <= 32 { return Err(Error::Other(format!("ShellExecuteExW: code {r}"))); }
    let pid = if info.h_process.is_null() { 0 } else {
        // The h_process is the new process handle; we need GetProcessId to get the PID.
        extern "system" { fn GetProcessId(h: *mut c_void) -> u32; }
        unsafe { GetProcessId(info.h_process) }
    };
    #[link(name = "kernel32")]
    extern "system" { fn CloseHandle(h: *mut c_void) -> i32; }
    if !info.h_process.is_null() { unsafe { CloseHandle(info.h_process); } }
    Ok(pid)
}

/// Spawn `control.exe` to open a system control panel applet by name.
pub fn open_cpl(name: &str) -> Result<u32> {
    shell_execute("open", "control.exe", Some(&format!("/name {name}")))
}

/// Spawn `mmc.exe` to open an MMC snap-in.
pub fn open_mmc(path: &str) -> Result<u32> {
    shell_execute("open", "mmc.exe", Some(path))
}

/// Open a Windows settings URI.
pub fn open_settings(uri: &str) -> Result<u32> {
    shell_execute("open", uri, None)
}

/// Open `explorer.exe` at a given path.
pub fn open_explorer(path: &str) -> Result<u32> {
    shell_execute("open", "explorer.exe", Some(path))
}

#[allow(dead_code)]
const fn _unused() { let _ = SE_ERR_NOERROR; }
