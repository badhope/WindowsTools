//! `wt-service` — WindowsTools SYSTEM service.
//!
//! Two run modes:
//! - Subcommand `install` / `uninstall` — register the binary as a Windows
//!   service named `WindowsToolsService`, running as `LocalSystem`, with
//!   demand start.
//! - Subcommand `run` / service-main — start the named-pipe server and
//!   dispatch JSON-RPC requests to the matching `wt-win32` function.
//!
//! All elevated operations live here so that the user-mode agent never has
//! to call UAC. The user-mode agent uses `sc start WindowsToolsService` to
//! ensure the service is up before it talks to the pipe.

#![cfg(windows)]

use std::ffi::{c_void, OsString};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

use serde::Deserialize;
use windows_service::{
    service::{
        ServiceAccess, ServiceControl, ServiceControlAccept, ServiceErrorControl, ServiceExitCode,
        ServiceInfo, ServiceStartType, ServiceState, ServiceStatus, ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher, Result as WsResult,
};

use wt_core::ipc::{Envelope, Request, Response};
use wt_core::registry_path::RegistryPath;
use wt_core::{Error, Integrity, Result};

use wt_win32::pipe as ipc_pipe;

/// The NT service name and display name.
pub const SERVICE_NAME: &str = "WindowsToolsService";
pub const SERVICE_DISPLAY: &str = "WindowsTools System Service";
/// Default pipe name (server instance 0).
pub const PIPE_NAME: &str = r"\\.\pipe\WindowsTools.Agent.0";

windows_service::define_windows_service!(ffi_service_main, service_main);

fn service_main(_args: Vec<OsString>) {
    if let Err(e) = run_service() {
        tracing::error!(error = %e, "service main failed");
    }
}

/// Blocking entry-point called by the SCM. Registers a control handler and
/// then drives the named-pipe server loop until the SCM tells us to stop.
pub fn run_service() -> anyhow::Result<()> {
    let stop = Arc::new(StopFlag::default());
    let stop_for_handler = stop.clone();
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                stop_for_handler.signal();
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };
    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

    // Tell the SCM we are starting.
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::StartPending,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::NO_ERROR,
        checkpoint: 0,
        wait_hint: std::time::Duration::from_secs(10),
        process_id: None,
    })?;

    // Build the pipe server.
    let server = start_pipe_server(stop.clone())?;

    // Tell the SCM we are running.
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::NO_ERROR,
        checkpoint: 0,
        wait_hint: std::time::Duration::default(),
        process_id: None,
    })?;

    // Wait for stop signal.
    while !stop.is_set() {
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
    tracing::info!("stop signal received, shutting down");
    let result = server.shutdown();

    // Tell the SCM we are stopped.
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: if result.is_ok() { ServiceExitCode::NO_ERROR } else { ServiceExitCode::Win32(1) },
        checkpoint: 0,
        wait_hint: std::time::Duration::default(),
        process_id: None,
    })?;
    result
}

#[derive(Default)]
struct StopFlag(AtomicBool);
impl StopFlag {
    fn signal(&self) { self.0.store(true, Ordering::SeqCst); }
    fn is_set(&self) -> bool { self.0.load(Ordering::SeqCst) }
}

#[derive(Clone, Copy, Debug)]
struct PipeHandle(*mut c_void);
unsafe impl Send for PipeHandle {}
unsafe impl Sync for PipeHandle {}

struct PipeServer {
    handles: Vec<std::thread::JoinHandle<()>>,
}

impl PipeServer {
    fn shutdown(self) -> anyhow::Result<()> {
        for h in self.handles { let _ = h.join(); }
        Ok(())
    }
}

/// Spawn the named-pipe accept threads; returns once at least one
/// instance is ready. Does NOT block waiting for `stop`.
fn start_pipe_server(stop: Arc<StopFlag>) -> anyhow::Result<PipeServer> {
    static CLIENT_COUNT: AtomicUsize = AtomicUsize::new(0);
    let max_clients = 8;

    tracing::info!(pipe = PIPE_NAME, "named-pipe server starting");
    let mut handles = Vec::new();

    for instance in 0..max_clients {
        let name = format!(r"\\.\pipe\WindowsTools.Agent.{instance}");
        let server = match ipc_pipe::create_server_by_name(&name) {
            Ok(h) => PipeHandle(h),
            Err(e) => { tracing::warn!(name, error = %e, "create_server failed"); continue; }
        };
        let stop = stop.clone();
        let counter = &CLIENT_COUNT;
        let h = std::thread::Builder::new()
            .name(format!("wt-svc-accept-{instance}"))
            .spawn(move || {
                loop {
                    if stop.is_set() { ipc_pipe::close(server.0); return; }
                    if let Err(e) = ipc_pipe::accept(server.0) {
                        if stop.is_set() { ipc_pipe::close(server.0); return; }
                        tracing::warn!(error = %e, "accept failed");
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        continue;
                    }
                    counter.fetch_add(1, Ordering::SeqCst);
                    if let Err(e) = handle_client(server) {
                        tracing::warn!(error = %e, "client handler error");
                    }
                    counter.fetch_sub(1, Ordering::SeqCst);
                    let _ = ipc_pipe::disconnect(server.0);
                }
            })?;
        handles.push(h);
    }
    Ok(PipeServer { handles })
}

/// Serve one connected client until disconnect.
fn handle_client(h: PipeHandle) -> Result<()> {
    // Greet with the build / version + service identity.
    let banner = serde_json::json!({
        "service": SERVICE_NAME,
        "version": env!("CARGO_PKG_VERSION"),
        "integrity": Integrity::System,
    });
    let hello_env = Envelope::Event(wt_core::ipc::Event {
        id: wt_core::ids::RequestId::new(),
        seq: 0,
        kind: "hello".to_string(),
        payload: banner,
    });
    ipc_pipe::send(h.0, &hello_env)?;
    loop {
        let env = match ipc_pipe::recv(h.0) {
            Ok(e) => e,
            Err(Error::Ipc(_)) | Err(Error::Other(_)) => return Ok(()),
            Err(e) => return Err(e),
        };
        let Envelope::Request(req) = env else {
            // Ignore stray events/responses from client.
            continue;
        };
        let reply = match dispatch(&req) {
            Ok(v) => Envelope::Response(Response::ok(req.id, v)),
            Err(e) => Envelope::Response(Response::err(req.id, e)),
        };
        ipc_pipe::send(h.0, &reply)?;
    }
}

/// Top-level request dispatch. The request's `id` is preserved.
pub fn dispatch(req: &Request) -> Result<serde_json::Value> {
    let method = req.op.as_str();
    let params = &req.params;
    let arg = |k: &str| -> Result<serde_json::Value> {
        params.get(k).cloned().ok_or_else(|| Error::InvalidInput(format!("missing arg: {k}")))
    };
    match method {
        "ping" => Ok(serde_json::json!({ "pong": true, "service": SERVICE_NAME })),
        // --- Identity ---
        "whoami" => Ok(serde_json::json!({
            "service": SERVICE_NAME,
            "integrity": Integrity::System,
        })),
        // --- Registry write (privileged) ---
        "registry.get_value" => {
            #[derive(Deserialize)]
            struct A { path: RegistryPath, name: String }
            let a: A = serde_json::from_value(params_to_value(params))?;
            let k = wt_win32::registry::open_path(&a.path, false)?;
            let v = wt_win32::registry::read_any(&k, &a.name)?;
            serde_json::to_value(&v).map_err(Error::from)
        }
        "registry.set_value" => {
            #[derive(Deserialize)]
            struct A { path: RegistryPath, name: String, kind: String, data_b64: String }
            let a: A = serde_json::from_value(params_to_value(params))?;
            let path = wt_win32::registry::open_path(&a.path, true)?;
            let bytes = base64_decode(&a.data_b64).map_err(|e| Error::InvalidInput(format!("base64: {e}")))?;
            let vd = match a.kind.as_str() {
                "REG_SZ" => wt_win32::registry::ValueData::Sz(decode_utf16le(&bytes)?),
                "REG_EXPAND_SZ" => wt_win32::registry::ValueData::ExpandSz(decode_utf16le(&bytes)?),
                "REG_DWORD" => {
                    if bytes.len() < 4 { return Err(Error::InvalidInput("dword data".into())); }
                    wt_win32::registry::ValueData::Dword(u32::from_le_bytes([bytes[0],bytes[1],bytes[2],bytes[3]]))
                }
                "REG_QWORD" => {
                    if bytes.len() < 8 { return Err(Error::InvalidInput("qword data".into())); }
                    let mut b = [0u8; 8];
                    b.copy_from_slice(&bytes[..8]);
                    wt_win32::registry::ValueData::Qword(u64::from_le_bytes(b))
                }
                "REG_MULTI_SZ" => {
                    let s = decode_utf16le(&bytes)?;
                    let parts: Vec<String> = s.split('\0').filter(|p| !p.is_empty()).map(String::from).collect();
                    wt_win32::registry::ValueData::MultiSz(parts)
                }
                "REG_BINARY" => wt_win32::registry::ValueData::Binary(bytes),
                other => return Err(Error::InvalidInput(format!("unknown kind: {other}"))),
            };
            wt_win32::registry::write_value(&path, &a.name, &vd)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "registry.delete_value" => {
            #[derive(Deserialize)]
            struct A { path: RegistryPath, name: String }
            let a: A = serde_json::from_value(params_to_value(params))?;
            let k = wt_win32::registry::open_path(&a.path, true)?;
            wt_win32::registry::delete_value(&k, &a.name)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "registry.delete_tree" => {
            #[derive(Deserialize)]
            struct A { path: RegistryPath }
            let a: A = serde_json::from_value(params_to_value(params))?;
            wt_win32::registry::delete_tree(a.path.hive(), a.path.sub())?;
            Ok(serde_json::json!({ "ok": true }))
        }
        // --- Services (privileged) ---
        "service.list" => {
            // Run the full enriched list (we're SYSTEM, so we have QUERY_CONFIG).
            let v = wt_win32::service::list()?;
            serde_json::to_value(v).map_err(Error::from)
        }
        "service.start" => {
            let name: String = serde_json::from_value(arg("name")?)?;
            wt_win32::service::control(&name, "start")?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "service.stop" => {
            let name: String = serde_json::from_value(arg("name")?)?;
            wt_win32::service::control(&name, "stop")?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "service.config" => {
            let name: String = serde_json::from_value(arg("name")?)?;
            let v = wt_win32::service::config_of(&name)?;
            serde_json::to_value(v).map_err(Error::from)
        }
        "service.set_start_type" => {
            #[derive(Deserialize)]
            struct A { name: String, start_type: String }
            let a: A = serde_json::from_value(params_to_value(params))?;
            wt_win32::service::set_start_type(&a.name, &a.start_type)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        // --- Hosts file (privileged) ---
        "hosts.write" => {
            #[derive(Deserialize)]
            struct A { entries: Vec<wt_win32::hosts::HostsEntry> }
            let a: A = serde_json::from_value(params_to_value(params))?;
            wt_win32::hosts::write_entries(&a.entries)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        // --- SFC / DISM (privileged) ---
        "repair.sfc" => {
            let cancel = wt_win32::repair::Cancel::new();
            let mut lines: Vec<(f32, String)> = Vec::new();
            wt_win32::repair::sfc(cancel, |pct, line| lines.push((pct, line.to_string())))?;
            Ok(serde_json::json!({ "lines": lines }))
        }
        "repair.dism" => {
            let cancel = wt_win32::repair::Cancel::new();
            let mut lines: Vec<(f32, String)> = Vec::new();
            wt_win32::repair::dism(cancel, |pct, line| lines.push((pct, line.to_string())))?;
            Ok(serde_json::json!({ "lines": lines }))
        }
        other => Err(Error::InvalidInput(format!("unknown method: {other}"))),
    }
}

fn params_to_value(params: &std::collections::BTreeMap<String, serde_json::Value>) -> serde_json::Value {
    let mut m = serde_json::Map::new();
    for (k, v) in params { m.insert(k.clone(), v.clone()); }
    serde_json::Value::Object(m)
}

fn decode_utf16le(bytes: &[u8]) -> Result<String> {
    if bytes.len() % 2 != 0 { return Err(Error::InvalidInput("odd length utf16".into())); }
    let mut v = Vec::with_capacity(bytes.len() / 2);
    for chunk in bytes.chunks_exact(2) {
        v.push(u16::from_le_bytes([chunk[0], chunk[1]]));
    }
    let mut s = String::from_utf16(&v).map_err(|e| Error::InvalidInput(format!("utf16: {e}")))?;
    while s.ends_with('\0') { s.pop(); }
    Ok(s)
}

fn base64_decode(s: &str) -> std::result::Result<Vec<u8>, String> {
    let s = s.trim();
    let chars: Vec<u8> = s.bytes().filter(|b| !b.is_ascii_whitespace()).collect();
    if chars.len() % 4 != 0 { return Err("bad length".into()); }
    let mut out = Vec::with_capacity(chars.len() / 4 * 3);
    for chunk in chars.chunks(4) {
        let mut vals = [0u8; 4];
        for (i, &c) in chunk.iter().enumerate() {
            vals[i] = match c {
                b'A'..=b'Z' => c - b'A',
                b'a'..=b'z' => c - b'a' + 26,
                b'0'..=b'9' => c - b'0' + 52,
                b'+' => 62,
                b'/' => 63,
                b'=' => 64,
                _ => return Err("bad char".into()),
            };
        }
        let mut n_pad = 0;
        for i in (0..4).rev() {
            if vals[i] == 64 { n_pad += 1; } else { break; }
        }
        let v2 = if vals[2] == 64 { 0 } else { vals[2] as u32 };
        let v3 = if vals[3] == 64 { 0 } else { vals[3] as u32 };
        let combined = ((vals[0] as u32) << 18) | ((vals[1] as u32) << 12) | (v2 << 6) | v3;
        out.push((combined >> 16) as u8);
        if n_pad < 2 { out.push((combined >> 8) as u8); }
        if n_pad < 1 { out.push(combined as u8); }
    }
    Ok(out)
}

// =================================================================
// Service install / uninstall (called from main.rs with subcommand)
// =================================================================

/// Install the service (called by the `install` subcommand).
pub fn install_service() -> WsResult<()> {
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CREATE_SERVICE)?;
    let info = ServiceInfo {
        name: SERVICE_NAME.into(),
        display_name: SERVICE_DISPLAY.into(),
        service_type: ServiceType::OWN_PROCESS,
        start_type: ServiceStartType::OnDemand,
        error_control: ServiceErrorControl::Normal,
        executable_path: std::env::current_exe().unwrap_or_default().into(),
        launch_arguments: vec!["run".into()],
        dependencies: vec![],
        account_name: None, // LocalSystem
        account_password: None,
    };
    let _svc = manager.create_service(&info, ServiceAccess::CHANGE_CONFIG)?;
    tracing::info!("service installed");
    Ok(())
}

/// Uninstall the service.
pub fn uninstall_service() -> WsResult<()> {
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)?;
    let svc = manager.open_service(SERVICE_NAME, ServiceAccess::DELETE)?;
    svc.delete()?;
    tracing::info!("service uninstalled");
    Ok(())
}

/// Run the SCM dispatcher when this binary is started by the SCM with `run`.
pub fn run_scm() -> WsResult<()> {
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
}

/// Run the named-pipe server in the current process, without the SCM.
/// Used for development and by the agent when it wants to test the binary
/// before install.
pub fn run_foreground() -> std::result::Result<(), String> {
    let stop = Arc::new(StopFlag::default());
    let server = start_pipe_server(stop.clone()).map_err(|e| e.to_string())?;
    while !stop.is_set() { std::thread::sleep(std::time::Duration::from_millis(200)); }
    server.shutdown().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn base64_roundtrip() {
        let cases: &[&[u8]] = &[b"", b"f", b"fo", b"foo", b"foob", b"fooba", b"foobar"];
        for s in cases {
            let enc = {
                let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                let mut out = String::new();
                let bytes = *s;
                let mut i = 0;
                while i < bytes.len() {
                    let b0 = bytes[i];
                    let b1 = if i + 1 < bytes.len() { bytes[i+1] } else { 0 };
                    let b2 = if i + 2 < bytes.len() { bytes[i+2] } else { 0 };
                    let n = if bytes.len() - i < 3 { bytes.len() - i } else { 3 };
                    out.push(chars[(b0 >> 2) as usize] as char);
                    out.push(chars[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
                    if n > 1 { out.push(chars[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char); } else { out.push('='); }
                    if n > 2 { out.push(chars[(b2 & 0x3F) as usize] as char); } else { out.push('='); }
                    i += 3;
                }
                out
            };
            assert_eq!(base64_decode(&enc).unwrap(), *s);
        }
    }
}
