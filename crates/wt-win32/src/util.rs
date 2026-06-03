//! Small helpers used by other modules: null-terminated wide string
//! builders, HRESULT conversion, `last_os_error` wrappers, and
//! `Drop` guards.

use std::ffi::OsString;
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use windows::Win32::Foundation::{GetLastError, HANDLE, WIN32_ERROR};
use wt_core::{Error, Result};

/// Convert a `&str` to a null-terminated UTF-16 vector.
pub fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Convert an `OsStr` to a null-terminated UTF-16 vector.
pub fn wide_null_os(s: &std::ffi::OsStr) -> Vec<u16> {
    s.encode_wide().chain(std::iter::once(0)).collect()
}

/// Convert a null-terminated UTF-16 buffer to `String`, with lossy fallback.
pub fn wide_to_string(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    OsString::from_wide(&buf[..len]).to_string_lossy().into_owned()
}

/// Return the current thread's last-error as our `Error` with a context.
pub fn last_error(ctx: &str) -> Error {
    let code = unsafe { GetLastError() }.0 as i32;
    Error::win32(code, ctx)
}

/// Convert a `WIN32_ERROR` return value from a Win32 call into our `Result`.
pub fn check(r: WIN32_ERROR, ctx: impl Into<String>) -> Result<()> {
    if r.0 == 0 {
        Ok(())
    } else {
        Err(Error::win32(r.0 as i32, ctx))
    }
}

/// A Drop guard that closes a Win32 HANDLE on scope exit.
pub struct HandleGuard(pub HANDLE);

impl Drop for HandleGuard {
    fn drop(&mut self) {
        // HANDLE.0 is *mut c_void; check non-null and not INVALID_HANDLE_VALUE.
        let p = self.0 .0;
        if !p.is_null() && p != -1isize as *mut _ {
            // SAFETY: the handle is owned and we are the last user.
            unsafe {
                let _ = windows::Win32::Foundation::CloseHandle(self.0);
            }
        }
    }
}
