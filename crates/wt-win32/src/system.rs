//! System information: OS version, hostname, user SID, uptime, integrity.

use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::SystemInformation::{
    GetComputerNameExW, GetTickCount64, ComputerNamePhysicalDnsHostname,
};
use windows::Win32::System::WindowsProgramming::GetUserNameW;
use wt_core::{Error, Result};
use crate::util::wide_to_string;

/// A high-level snapshot of the host.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSnapshot {
    pub computer_name: String,
    pub user_name: String,
    pub user_sid: String,
    pub major: u32,
    pub minor: u32,
    pub build: u32,
    pub display: String,
    pub edition: String,
    pub uptime_seconds: u64,
    pub pid: u32,
    pub is_elevated: bool,
}

/// Read the local computer name (physical DNS hostname).
pub fn computer_name() -> Result<String> {
    let mut size: u32 = 0;
    let _ = unsafe { GetComputerNameExW(ComputerNamePhysicalDnsHostname, windows::core::PWSTR(std::ptr::null_mut()), &mut size) };
    let mut buf = vec![0u16; size as usize + 1];
    unsafe {
        GetComputerNameExW(ComputerNamePhysicalDnsHostname, windows::core::PWSTR(buf.as_mut_ptr()), &mut size)
            .map_err(|e| Error::win32(e.code().0, "GetComputerNameExW"))?;
    }
    Ok(wide_to_string(&buf))
}

/// Read the current user name.
pub fn user_name() -> Result<String> {
    let mut size: u32 = 256;
    let mut buf = vec![0u16; 256];
    let ok = unsafe { GetUserNameW(windows::core::PWSTR(buf.as_mut_ptr()), &mut size) };
    if ok.is_err() {
        return Err(crate::util::last_error("GetUserNameW"));
    }
    Ok(wide_to_string(&buf))
}

/// Current process id.
pub fn current_pid() -> u32 {
    std::process::id()
}

/// Read the current process token's linked SID as a string.
pub fn user_sid() -> Result<String> {
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    use windows::Win32::Security::{GetTokenInformation, TokenUser, TOKEN_QUERY};
    let mut token = HANDLE::default();
    unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }
        .map_err(|e| Error::win32(e.code().0, "OpenProcessToken"))?;
    let _g = crate::util::HandleGuard(token);

    let mut needed: u32 = 0;
    let _ = unsafe { GetTokenInformation(token, TokenUser, None, 0, &mut needed) };
    if needed == 0 {
        return Err(crate::util::last_error("GetTokenInformation size"));
    }
    let mut buf = vec![0u8; needed as usize];
    unsafe { GetTokenInformation(token, TokenUser, Some(buf.as_mut_ptr() as _), needed, &mut needed) }
        .map_err(|e| Error::win32(e.code().0, "GetTokenInformation"))?;

    let tu: &windows::Win32::Security::TOKEN_USER = unsafe { &*(buf.as_ptr() as *const windows::Win32::Security::TOKEN_USER) };
    let sid = tu.User.Sid;
    if sid.0.is_null() {
        return Err(Error::Other("null SID from GetTokenInformation".into()));
    }
    let mut pwstr = windows::core::PWSTR(std::ptr::null_mut());
    unsafe { windows::Win32::Security::Authorization::ConvertSidToStringSidW(sid, &mut pwstr) }
        .map_err(|e| Error::win32(e.code().0, "ConvertSidToStringSidW"))?;
    if pwstr.0.is_null() {
        return Err(Error::Other("null SID string".into()));
    }
    let s = unsafe { widestring::U16CStr::from_ptr_str(pwstr.0) }
        .to_string_lossy();
    unsafe {
        let _ = windows::Win32::Foundation::LocalFree(windows::Win32::Foundation::HLOCAL(pwstr.0 as *mut _));
    }
    Ok(s)
}

/// OS version triple (major, minor, build) read from registry (works on
/// all Windows versions where the registry is intact).
pub fn os_version() -> Result<(u32, u32, u32, String, String)> {
    use crate::registry::Hive;
    let lm = crate::registry::open_key(Hive::LocalMachine, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", false)?;
    let major = crate::registry::read_dword(&lm, "CurrentMajorVersionNumber").unwrap_or(0);
    let minor = crate::registry::read_dword(&lm, "CurrentMinorVersionNumber").unwrap_or(0);
    let build_str = crate::registry::read_string(&lm, "CurrentBuild").unwrap_or_default();
    let build: u32 = build_str.parse().unwrap_or(0);
    let product = crate::registry::read_string(&lm, "ProductName").unwrap_or_else(|_| "Windows".into());
    let display = crate::registry::read_string(&lm, "DisplayVersion").unwrap_or_default();
    Ok((major, minor, build, product, display))
}

/// System uptime in seconds.
pub fn uptime_seconds() -> u64 {
    let ms = unsafe { GetTickCount64() };
    ms / 1000
}

/// Local system time as a `DateTime<Utc>`.
pub fn now_utc() -> DateTime<Utc> {
    let secs = chrono::Utc::now().timestamp();
    Utc.timestamp_opt(secs, 0).single().unwrap_or_else(Utc::now)
}

/// Build a complete snapshot.
pub fn snapshot() -> Result<SystemSnapshot> {
    let (major, minor, build, product, display) = os_version().unwrap_or((0, 0, 0, "Windows".into(), String::new()));
    let full_display = if display.is_empty() {
        format!("{product} (build {build})")
    } else {
        format!("{product} {display} (build {build})")
    };
    Ok(SystemSnapshot {
        computer_name: computer_name().unwrap_or_default(),
        user_name: user_name().unwrap_or_default(),
        user_sid: user_sid().unwrap_or_default(),
        major, minor, build,
        display: full_display,
        edition: product,
        uptime_seconds: uptime_seconds(),
        pid: current_pid(),
        is_elevated: crate::privilege::is_elevated(),
    })
}

/// Return `true` if the current process is running as the Local System account.
pub fn is_local_system() -> bool {
    user_sid().map(|s| s == "S-1-5-18").unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reads_user_name() {
        let n = user_name().unwrap();
        assert!(!n.is_empty());
    }
    #[test]
    fn reads_sid() {
        let s = user_sid().unwrap();
        assert!(s.starts_with("S-1-5-"));
    }
    #[test]
    fn uptime_nonzero() {
        assert!(uptime_seconds() > 0);
    }
}
