//! Named-pipe server / client used by `wt-agent` <-> `wt-service` IPC.
//!
//! Uses direct FFI to kernel32 to avoid the `windows` crate's awkward
//! generated bindings for these old Win32 APIs.

use std::ffi::c_void;
use wt_core::ipc::Envelope;
use wt_core::Result;

pub const DEFAULT_PIPE: &str = r"\\.\pipe\WindowsTools.Agent";

pub type PipeHandle = *mut c_void;

/// A Send/Sync newtype around `PipeHandle` for use across threads.
/// The raw pointer is only ever accessed from the same thread, so the
/// `Send` / `Sync` impls are safe.
#[derive(Clone, Copy, Debug)]
pub struct PipeSlot(pub PipeHandle);
unsafe impl Send for PipeSlot {}
unsafe impl Sync for PipeSlot {}

const PIPE_ACCESS_DUPLEX: u32 = 0x00000003;
const PIPE_TYPE_MESSAGE: u32 = 0x00000004;
const PIPE_READMODE_MESSAGE: u32 = 0x00000002;
const PIPE_WAIT: u32 = 0x00000000;
const PIPE_REJECT_REMOTE_CLIENTS: u32 = 0x00000008;
const PIPE_UNLIMITED_INSTANCES: u32 = 255;
const FILE_GENERIC_READ: u32 = 0x00120089;
const FILE_GENERIC_WRITE: u32 = 0x00120116;
const FILE_SHARE_READ: u32 = 0x00000001;
const FILE_SHARE_WRITE: u32 = 0x00000002;
const OPEN_EXISTING: u32 = 3;
const INVALID_HANDLE_VALUE: *mut c_void = -1 as isize as *mut c_void;

#[link(name = "kernel32")]
extern "system" {
    fn CreateNamedPipeW(
        name: *const u16,
        open_mode: u32,
        pipe_mode: u32,
        max_instances: u32,
        out_buf_size: u32,
        in_buf_size: u32,
        default_timeout: u32,
        security_attr: *mut c_void,
    ) -> *mut c_void;
    fn ConnectNamedPipe(handle: *mut c_void, overlapped: *mut c_void) -> i32;
    fn DisconnectNamedPipe(handle: *mut c_void) -> i32;
    fn CreateFileW(
        name: *const u16,
        access: u32,
        share: u32,
        security_attr: *mut c_void,
        creation: u32,
        flags: u32,
        template: *mut c_void,
    ) -> *mut c_void;
    fn WaitNamedPipeW(name: *const u16, timeout_ms: u32) -> i32;
    fn ReadFile(
        handle: *mut c_void,
        buf: *mut u8,
        bytes_to_read: u32,
        bytes_read: *mut u32,
        overlapped: *mut c_void,
    ) -> i32;
    fn WriteFile(
        handle: *mut c_void,
        buf: *const u8,
        bytes_to_write: u32,
        bytes_written: *mut u32,
        overlapped: *mut c_void,
    ) -> i32;
    fn CloseHandle(handle: *mut c_void) -> i32;
    fn GetLastError() -> u32;
}

fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn check(r: i32, op: &str) -> Result<()> {
    if r == 0 { Err(wt_core::Error::win32(unsafe { GetLastError() } as i32, op)) } else { Ok(()) }
}

/// Create a server end of a named pipe. `instance` lets you create multiple
/// instances; pass 0 for the first, 1 for the second, ...
pub fn create_server(instance: u32) -> Result<PipeHandle> {
    let name = format!(r"\\.\pipe\WindowsTools.Agent.{instance}");
    create_server_by_name(&name)
}

/// Create a server end of a named pipe with an explicit name.
/// The pipe grants GENERIC_READ + GENERIC_WRITE to the
/// `Everyone` well-known SID (S-1-1-0), so the same logged-on user can
/// talk to the service from a non-elevated process.
pub fn create_server_by_name(name: &str) -> Result<PipeHandle> {
    let name_w = wide_null(name);
    unsafe {
        let sa = build_security_attributes();
        let h = CreateNamedPipeW(
            name_w.as_ptr(),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            PIPE_UNLIMITED_INSTANCES,
            64 * 1024,
            64 * 1024,
            0,
            sa.as_ref() as *const Sa as *mut c_void,
        );
        if h.is_null() || h == INVALID_HANDLE_VALUE {
            return Err(wt_core::Error::win32(GetLastError() as i32, "CreateNamedPipeW"));
        }
        // Leak the security descriptor; the process lives as long as the pipe.
        std::mem::forget(sa);
        Ok(h)
    }
}

#[repr(C)]
pub struct Sa {
    pub n_length: u32,
    pub lp_security_descriptor: *mut c_void,
    pub b_inherit_handle: i32,
}

/// Build a SECURITY_ATTRIBUTES that grants read/write to `Everyone`.
/// Returns a non-null pointer that the caller is responsible for keeping
/// alive (we leak it deliberately; the process owns it for its lifetime).
fn build_security_attributes() -> Box<Sa> {
    #[link(name = "advapi32")]
    extern "system" {
        fn ConvertStringSecurityDescriptorToSecurityDescriptorW(
            string_sd: *const u16,
            sd_revision: u32,
            sd: *mut *mut c_void,
            sd_size: *mut u32,
        ) -> i32;
    }

    // D: = DACL, (A;;GA;;;WD) = Allow Generic All to World (Everyone, S-1-1-0).
    let sd_string = wide_null("D:(A;;GA;;;WD)");
    let mut sd: *mut c_void = std::ptr::null_mut();
    let mut sd_size: u32 = 0;
    let r = unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sd_string.as_ptr(), 1, &mut sd, &mut sd_size,
        )
    };
    if r == 0 || sd.is_null() {
        return Box::new(Sa { n_length: std::mem::size_of::<Sa>() as u32, lp_security_descriptor: std::ptr::null_mut(), b_inherit_handle: 0 });
    }
    Box::new(Sa { n_length: std::mem::size_of::<Sa>() as u32, lp_security_descriptor: sd, b_inherit_handle: 0 })
}

/// Block until a client connects to the server end.
pub fn accept(server: PipeHandle) -> Result<()> {
    unsafe {
        // ConnectNamedPipe returns 0 on success in blocking mode (== ERROR_PIPE_CONNECTED if already).
        let r = ConnectNamedPipe(server, std::ptr::null_mut());
        let e = GetLastError();
        if r != 0 || e == 0x00000317 {
            // ERROR_PIPE_CONNECTED means client connected before we called
            Ok(())
        } else {
            Err(wt_core::Error::win32(e as i32, "ConnectNamedPipe"))
        }
    }
}

/// Disconnect (kick) the current client.
pub fn disconnect(server: PipeHandle) -> Result<()> {
    unsafe { check(DisconnectNamedPipe(server), "DisconnectNamedPipe") }
}

/// Connect to a named pipe (client side). Blocks up to 5s for the server.
pub fn connect_client(name: &str) -> Result<PipeHandle> {
    let name_w = wide_null(name);
    unsafe {
        let _ = WaitNamedPipeW(name_w.as_ptr(), 5000);
        let h = CreateFileW(
            name_w.as_ptr(),
            FILE_GENERIC_READ | FILE_GENERIC_WRITE,
            0,
            std::ptr::null_mut(),
            OPEN_EXISTING,
            0,
            std::ptr::null_mut(),
        );
        if h.is_null() || h == INVALID_HANDLE_VALUE {
            return Err(wt_core::Error::win32(GetLastError() as i32, format!("CreateFileW {name}")));
        }
        Ok(h)
    }
}

/// Send a single envelope (length-prefixed JSON frame) over the pipe.
pub fn send(h: PipeHandle, env: &Envelope) -> Result<()> {
    let bytes = serde_json::to_vec(env).map_err(wt_core::Error::from)?;
    let len = (bytes.len() as u32).to_le_bytes();
    unsafe {
        let mut written: u32 = 0;
        let r = WriteFile(h, len.as_ptr(), 4, &mut written, std::ptr::null_mut());
        check(r, "WriteFile length")?;
        if written != 4 {
            return Err(wt_core::Error::Ipc(format!("WriteFile short length: {written}")));
        }
        written = 0;
        let r = WriteFile(h, bytes.as_ptr(), bytes.len() as u32, &mut written, std::ptr::null_mut());
        check(r, "WriteFile payload")?;
        if written as usize != bytes.len() {
            return Err(wt_core::Error::Ipc(format!("WriteFile short payload: {written}")));
        }
    }
    Ok(())
}

/// Receive a single envelope (length-prefixed JSON frame) from the pipe.
pub fn recv(h: PipeHandle) -> Result<Envelope> {
    let mut len_buf = [0u8; 4];
    let mut read: u32 = 0;
    unsafe {
        let r = ReadFile(h, len_buf.as_mut_ptr(), 4, &mut read, std::ptr::null_mut());
        check(r, "ReadFile length")?;
        if read == 0 { return Err(wt_core::Error::Ipc("pipe closed".into())); }
        if read != 4 {
            return Err(wt_core::Error::Ipc(format!("ReadFile short length: {read}")));
        }
        let len = u32::from_le_bytes(len_buf) as usize;
        let mut buf = vec![0u8; len];
        let r = ReadFile(h, buf.as_mut_ptr(), len as u32, &mut read, std::ptr::null_mut());
        check(r, "ReadFile payload")?;
        if read as usize != len {
            return Err(wt_core::Error::Ipc(format!("ReadFile short payload: {read} of {len}")));
        }
        Ok(serde_json::from_slice(&buf).map_err(wt_core::Error::from)?)
    }
}

pub fn close(h: PipeHandle) {
    if !h.is_null() && h != INVALID_HANDLE_VALUE {
        unsafe { CloseHandle(h) };
    }
}
