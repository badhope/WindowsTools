//! Token / integrity / UAC helpers.
//!
//! Used to decide whether an operation should run in the agent (user) or
//! be forwarded to the service (SYSTEM).

use windows::Win32::Foundation::{CloseHandle, HANDLE, WIN32_ERROR};
use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
use windows::Win32::Security::{
    GetTokenInformation, TokenElevation, TokenIntegrityLevel, TOKEN_QUERY,
    TOKEN_ELEVATION, TOKEN_MANDATORY_LABEL,
};
use wt_core::{Error, Integrity, Result};

/// Returns `true` if the current process has an elevated (admin / system) token.
pub fn is_elevated() -> bool {
    let mut token: HANDLE = HANDLE(std::ptr::null_mut());
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }.is_err() {
        return false;
    }
    let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
    let mut ret_len: u32 = 0;
    let ok = unsafe {
        GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_len,
        )
    };
    let _ = unsafe { CloseHandle(token) };
    ok.is_ok() && elevation.TokenIsElevated != 0
}

/// Returns the integrity level of the current process token.
pub fn integrity_level() -> Result<Integrity> {
    let mut token: HANDLE = HANDLE(std::ptr::null_mut());
    unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }
        .map_err(|e| Error::win32(e.code().0, "OpenProcessToken"))?;
    let _g = crate::util::HandleGuard(token);

    let mut needed: u32 = 0;
    let _ = unsafe { GetTokenInformation(token, TokenIntegrityLevel, None, 0, &mut needed) };
    if needed == 0 {
        return Err(crate::util::last_error("GetTokenInformation size"));
    }
    let mut buf = vec![0u8; needed as usize];
    unsafe { GetTokenInformation(token, TokenIntegrityLevel, Some(buf.as_mut_ptr() as _), needed, &mut needed) }
        .map_err(|e| Error::win32(e.code().0, "GetTokenInformation"))?;

    let tml: &TOKEN_MANDATORY_LABEL = unsafe { &*(buf.as_ptr() as *const TOKEN_MANDATORY_LABEL) };
    let sid = tml.Label.Sid;
    if sid.0.is_null() {
        return Ok(Integrity::Unknown);
    }
    // Read sub-authority count directly from the SID structure (byte 1).
    let sub_count: u8 = unsafe { *(sid.0.add(1) as *const u8) };
    if sub_count == 0 {
        return Ok(Integrity::Unknown);
    }
    let idx = sub_count as u32 - 1;
    let p = unsafe { windows::Win32::Security::GetSidSubAuthority(sid, idx) };
    if p.is_null() {
        return Ok(Integrity::Unknown);
    }
    let rid = unsafe { *p };
    Ok(match rid {
        0x0000 => Integrity::Untrusted,
        0x1000 => Integrity::Low,
        0x2000 => Integrity::Medium,
        0x2100 => Integrity::MediumPlus,
        0x3000 => Integrity::High,
        0x4000 => Integrity::System,
        _ => Integrity::Unknown,
    })
}

/// Re-launch the current executable with `runas` verb. Returns the new process id
/// (or 0 if the user cancels the UAC prompt).
pub fn relaunch_elevated() -> Result<u32> {
    use windows::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOASYNC, SHELLEXECUTEINFOW};
    let exe = std::env::current_exe().map_err(|e| Error::Other(format!("current_exe: {e}")))?;
    let verb = crate::util::wide_null("runas");
    let file = crate::util::wide_null_os(exe.as_os_str());
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOASYNC,
        lpVerb: windows::core::PCWSTR(verb.as_ptr()),
        lpFile: windows::core::PCWSTR(file.as_ptr()),
        nShow: 1,
        ..Default::default()
    };
    unsafe { ShellExecuteExW(&mut info) }
        .map_err(|e| Error::win32(e.code().0, "ShellExecuteExW"))?;
    let pid = if info.hProcess.0.is_null() { 0 } else { info.hProcess.0 as u32 };
    Ok(pid)
}

/// Returns the current user's SID as a string (e.g. "S-1-5-21-...").
pub fn user_sid() -> Result<String> {
    use windows::Win32::System::Threading::GetCurrentProcess;
    let mut token: HANDLE = HANDLE(std::ptr::null_mut());
    unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }
        .map_err(|e| Error::win32(e.code().0, "OpenProcessToken"))?;
    let _g = crate::util::HandleGuard(token);

    use windows::Win32::Security::TOKEN_USER;
    let mut needed: u32 = 0;
    let _ = unsafe { GetTokenInformation(token, windows::Win32::Security::TokenUser, None, 0, &mut needed) };
    if needed == 0 { return Err(crate::util::last_error("GetTokenInformation size")); }
    let mut buf = vec![0u8; needed as usize];
    unsafe { GetTokenInformation(token, windows::Win32::Security::TokenUser, Some(buf.as_mut_ptr() as _), needed, &mut needed) }
        .map_err(|e| Error::win32(e.code().0, "GetTokenInformation"))?;
    let tu: &TOKEN_USER = unsafe { &*(buf.as_ptr() as *const TOKEN_USER) };
    let sid = tu.User.Sid;
    if sid.0.is_null() { return Err(Error::Other("null SID".into())); }

    #[link(name = "advapi32")]
    extern "system" {
        fn ConvertSidToStringSidW(sid: *const c_void, string_sid: *mut *mut u16) -> i32;
    }
    use std::ffi::c_void;
    let mut ptr: *mut u16 = std::ptr::null_mut();
    let ok = unsafe { ConvertSidToStringSidW(sid.0, &mut ptr) };
    if ok == 0 || ptr.is_null() { return Err(crate::util::last_error("ConvertSidToStringSidW")); }
    let len = (0..).find(|&i| unsafe { *ptr.add(i) } == 0).unwrap_or(0);
    let s = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(ptr, len) });
    unsafe { windows::Win32::Foundation::LocalFree(windows::Win32::Foundation::HLOCAL(ptr as *mut c_void)) };
    Ok(s)
}

/// Convenience helper: human-readable label of the integrity level.
pub fn integrity_label(level: Integrity) -> &'static str {
    match level {
        Integrity::Untrusted => "Untrusted",
        Integrity::Low => "Low",
        Integrity::Medium => "Medium",
        Integrity::MediumPlus => "Medium (UAC elevated)",
        Integrity::High => "High (Administrator)",
        Integrity::System => "System",
        Integrity::Unknown => "Unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn integrity_classifies() {
        let _ = integrity_level();
        let _ = is_elevated();
    }
    #[test]
    fn user_sid_well_formed() {
        let s = user_sid().unwrap();
        assert!(s.starts_with("S-1-5-"));
    }
}
