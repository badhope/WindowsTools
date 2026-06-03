//! `wt-agent` — user-mode sidecar that brokers requests between
//! `wt-ui` (Tauri) and the SYSTEM `wt-service`.
//!
//! ## Transport
//!
//! `wt-ui` <-> `wt-agent`: line-delimited JSON on stdin/stdout.
//!
//! `wt-agent` <-> `wt-service`: length-prefixed JSON on the named pipe
//! `\\.\pipe\WindowsTools.Agent.0` (see `wt-core::ipc` for framing).
//!
//! ## Integrity routing
//!
//! Each request declares the `Integrity` it needs. The agent:
//! - runs operations at `Low`/`Medium`/`MediumPlus` itself using
//!   `wt-win32` (no UAC),
//! - forwards `High`/`System` operations to the pipe (which runs as
//!   `LocalSystem`), and
//! - promotes `Unknown` to the lowest integrity that satisfies the
//!   operation's needs.
//!
//! No more whole-app "restart as admin" prompts: the user can grant
//! privilege on a per-operation basis by ticking a checkbox in the UI.

#![cfg(windows)]

use std::collections::BTreeMap;
use std::io::{self, BufRead, Write};
use std::time::Duration;

use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use wt_core::ids::RequestId;
use wt_core::ipc::{Envelope, Event, Request, Response};
use wt_core::registry_path::RegistryPath;
use wt_core::{Error, Result};
use wt_win32::pipe as ipc_pipe;

/// Path to the Windows service binary, relative to the agent.
pub const SERVICE_BIN_NAME: &str = "wt-service.exe";
/// The named pipe used to talk to the service.
pub const PIPE_NAME: &str = r"\\.\pipe\WindowsTools.Agent.0";
/// NT service name (matches wt-service::SERVICE_NAME).
pub const SERVICE_NAME: &str = "WindowsToolsService";

/// One outbound connection to the service pipe. The service disconnects
/// after each request, so we always re-establish a fresh handle per call.
struct ServiceClient;

impl ServiceClient {
    /// Ensure the service is installed + running, and open a new connection.
    fn open(&self) -> Result<ipc_pipe::PipeHandle> {
        ensure_service_started()?;
        ipc_pipe::connect_client(PIPE_NAME)
    }
    fn close(&self, h: ipc_pipe::PipeHandle) { ipc_pipe::close(h); }
}

/// Make sure the SYSTEM service is running. Tries `sc start` after a
/// `sc query` to avoid the noisy "already running" error. Also accepts
/// `START_PENDING` (in the middle of starting) as "running".
fn ensure_service_started() -> Result<()> {
    if service_state_accepts_pipe()? { return Ok(()); }
    let status = std::process::Command::new("sc.exe")
        .args(["start", SERVICE_NAME])
        .output()
        .map_err(|e| Error::Other(format!("sc start spawn: {e}")))?;
    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        return Err(Error::Other(format!("sc start: {}", stderr.trim())));
    }
    // Wait for it to bind the pipe.
    for _ in 0..50 {
        if let Ok(_) = ipc_pipe::connect_client(PIPE_NAME) { return Ok(()); }
        std::thread::sleep(Duration::from_millis(100));
    }
    Err(Error::Other("service did not bind the pipe in time".into()))
}

/// `sc query` and check whether the service is up enough to bind a pipe.
fn service_state_accepts_pipe() -> Result<bool> {
    let out = std::process::Command::new("sc.exe")
        .args(["query", SERVICE_NAME])
        .output()
        .map_err(|e| Error::Other(format!("sc query: {e}")))?;
    let s = String::from_utf8_lossy(&out.stdout);
    if !out.status.success() { return Ok(false); }
    Ok(s.lines().any(|l| l.contains("RUNNING") || l.contains("START_PENDING")))
}

/// Disconnect from the service pipe.
pub fn close() {
    // No persistent handle to close; the per-call open() / close() pattern
    // cleans up after each request.
}

static SERVICE: std::sync::OnceLock<ServiceClient> = std::sync::OnceLock::new();
fn service() -> &'static ServiceClient {
    SERVICE.get_or_init(|| ServiceClient)
}

/// Send a request to the service and return its result. Streams events
/// into `on_event` if provided.
pub fn call_service(
    op: &str,
    params: BTreeMap<String, serde_json::Value>,
    mut on_event: Option<impl FnMut(&Event)>,
) -> Result<serde_json::Value> {
    let h = service().open()?;
    let req = build_request(op, params)?;
    let env = Envelope::Request(req.clone());
    ipc_pipe::send(h, &env)?;
    loop {
        let env = match ipc_pipe::recv(h) {
            Ok(e) => e,
            Err(e) => { service().close(h); return Err(e); }
        };
        match env {
            Envelope::Event(e) => {
                if e.id == req.id { if let Some(cb) = on_event.as_mut() { cb(&e); } }
            }
            Envelope::Response(Response::Ok { id, result }) if id == req.id => {
                return Ok(result);
            }
            Envelope::Response(Response::Err { id, error }) if id == req.id => {
                return Err(error);
            }
            other => {
                tracing::debug!(?other, "ignoring stale pipe envelope");
            }
        }
    }
}

fn build_request(op: &str, params: BTreeMap<String, serde_json::Value>) -> Result<Request> {
    let caller_pid = std::process::id();
    let caller_sid = wt_win32::privilege::user_sid().unwrap_or_default();
    let mut nonce = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut nonce);
    // MAC is computed but the service-side validator is opt-in (skip by default).
    let mac = {
        use sha2::Digest;
        let mut h = Sha256::new();
        h.update(op.as_bytes());
        for (k, v) in &params {
            h.update([0x1F]);
            h.update(k.as_bytes());
            h.update([0x1E]);
            h.update(serde_json::to_vec(v).map_err(wt_core::Error::from)?.as_slice());
        }
        h.update(&nonce);
        h.finalize().to_vec()
    };
    Ok(Request { id: RequestId::new(), op: op.into(), params, caller_pid, caller_sid, mac, nonce })
}

// =================================================================
// High-level operations the UI calls. Each one picks the cheapest
// route: local (wt-win32) for low-integrity, pipe for high.
// =================================================================

/// Read a registry value. Walks through the service for HKLM paths
/// (which require admin), runs locally for HKCU.
pub fn registry_get(path: &RegistryPath, name: &str) -> Result<serde_json::Value> {
    if path.requires_admin() {
        let mut p = BTreeMap::new();
        p.insert("path".into(), serde_json::to_value(path)?);
        p.insert("name".into(), serde_json::Value::String(name.into()));
        return call_service("registry.get_value", p, None::<fn(&Event)>);
    }
    let key = wt_win32::registry::open_path(path, false)?;
    let v = wt_win32::registry::read_any(&key, name)?;
    serde_json::to_value(&v).map_err(Error::from)
}

/// Write a registry value. Forwards to the service for HKLM paths.
pub fn registry_set(path: &RegistryPath, name: &str, kind: &str, bytes: &[u8]) -> Result<()> {
    let mut p = BTreeMap::new();
    p.insert("path".into(), serde_json::to_value(path)?);
    p.insert("name".into(), serde_json::Value::String(name.into()));
    p.insert("kind".into(), serde_json::Value::String(kind.into()));
    p.insert("data_b64".into(), serde_json::Value::String(b64_encode(bytes)));
    call_service("registry.set_value", p, None::<fn(&Event)>)?;
    Ok(())
}

pub fn service_list() -> Result<serde_json::Value> {
    // Run locally in user mode. Enumerates the SCM with QUERY_STATUS only;
    // QUERY_CONFIG (start type, description) needs admin and is left blank.
    // Callers should follow up with `service_config` for each row they need.
    let v = wt_win32::service::list_status_only()?;
    serde_json::to_value(v).map_err(Error::from)
}

pub fn service_config(name: &str) -> Result<serde_json::Value> {
    let mut p = BTreeMap::new();
    p.insert("name".to_string(), serde_json::Value::String(name.to_string()));
    call_service("service.config", p, None::<fn(&Event)>)
}

pub fn service_start(name: &str) -> Result<()> {
    let mut p = BTreeMap::new();
    p.insert("name".into(), serde_json::Value::String(name.into()));
    call_service("service.start", p, None::<fn(&Event)>)?;
    Ok(())
}

pub fn service_stop(name: &str) -> Result<()> {
    let mut p = BTreeMap::new();
    p.insert("name".into(), serde_json::Value::String(name.into()));
    call_service("service.stop", p, None::<fn(&Event)>)?;
    Ok(())
}

pub fn hosts_list() -> Result<serde_json::Value> {
    let v = wt_win32::hosts::list()?;
    serde_json::to_value(v).map_err(Error::from)
}

pub fn hosts_write(entries: Vec<wt_win32::hosts::HostsEntry>) -> Result<()> {
    let mut p = BTreeMap::new();
    p.insert("entries".into(), serde_json::to_value(entries)?);
    call_service("hosts.write", p, None::<fn(&Event)>)?;
    Ok(())
}

pub fn sfc() -> Result<serde_json::Value> {
    call_service("repair.sfc", BTreeMap::new(), None::<fn(&Event)>)
}

pub fn dism() -> Result<serde_json::Value> {
    call_service("repair.dism", BTreeMap::new(), None::<fn(&Event)>)
}

pub fn whoami() -> Result<serde_json::Value> {
    call_service("whoami", BTreeMap::new(), None::<fn(&Event)>)
}

fn b64_encode(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    let mut i = 0;
    while i < bytes.len() {
        let b0 = bytes[i];
        let b1 = if i + 1 < bytes.len() { bytes[i + 1] } else { 0 };
        let b2 = if i + 2 < bytes.len() { bytes[i + 2] } else { 0 };
        let n = if bytes.len() - i < 3 { bytes.len() - i } else { 3 };
        out.push(CHARS[(b0 >> 2) as usize] as char);
        out.push(CHARS[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if n > 1 { out.push(CHARS[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char); } else { out.push('='); }
        if n > 2 { out.push(CHARS[(b2 & 0x3F) as usize] as char); } else { out.push('='); }
        i += 3;
    }
    out
}

// =================================================================
// JSON-RPC over stdio (line-delimited). The Tauri host speaks to us
// with one JSON object per line. We answer with one JSON object per
// line, matching by `id`.
// =================================================================

#[derive(Deserialize, Debug)]
struct StdioRequest {
    id: serde_json::Value,
    op: String,
    #[serde(default)]
    params: BTreeMap<String, serde_json::Value>,
}

#[derive(Serialize, Debug)]
struct StdioResponse<'a> {
    id: &'a serde_json::Value,
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<&'a serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<&'a wt_core::Error>,
}

/// Run the stdio JSON-RPC loop. Returns when stdin closes.
pub fn run_stdio_loop() -> Result<()> {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    for line in stdin.lock().lines() {
        let line = line.map_err(|e| Error::Io(e.to_string()))?;
        if line.trim().is_empty() { continue; }
        let req: StdioRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let resp = serde_json::json!({ "id": null, "ok": false, "error": { "kind": "InvalidInput", "msg": e.to_string() } });
                writeln!(out, "{}", resp).ok();
                out.flush().ok();
                continue;
            }
        };
        let r = dispatch_stdio(&req);
        match r {
            Ok(v) => {
                let resp = StdioResponse { id: &req.id, ok: true, result: Some(&v), error: None };
                writeln!(out, "{}", serde_json::to_string(&resp).unwrap()).ok();
            }
            Err(e) => {
                let resp = StdioResponse { id: &req.id, ok: false, result: None, error: Some(&e) };
                writeln!(out, "{}", serde_json::to_string(&resp).unwrap()).ok();
            }
        }
        out.flush().ok();
    }
    Ok(())
}

fn dispatch_stdio(req: &StdioRequest) -> Result<serde_json::Value> {
    let path_param = || -> Result<RegistryPath> {
        let v = req.params.get("path").cloned().unwrap_or(serde_json::Value::Null);
        if let Some(s) = v.as_str() {
            RegistryPath::parse(s).map_err(|e| Error::InvalidInput(e.to_string()))
        } else {
            serde_json::from_value(v).map_err(Error::from)
        }
    };
    match req.op.as_str() {
        "ping" => Ok(serde_json::json!({ "pong": true, "ts": chrono::Utc::now() })),
        "whoami" => whoami(),
        "registry.get" => {
            let path = path_param()?;
            let name: String = serde_json::from_value(req.params.get("name").cloned().unwrap_or_default())?;
            registry_get(&path, &name)
        }
        "registry.set" => {
            let path = path_param()?;
            let name: String = serde_json::from_value(req.params.get("name").cloned().unwrap_or_default())?;
            let kind: String = serde_json::from_value(req.params.get("kind").cloned().unwrap_or_default())?;
            let data_b64: String = serde_json::from_value(req.params.get("data_b64").cloned().unwrap_or_default())?;
            let bytes = b64_decode(&data_b64).map_err(|e| Error::InvalidInput(e))?;
            registry_set(&path, &name, &kind, &bytes)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "service.list" => service_list(),
        "service.start" => {
            let name: String = serde_json::from_value(req.params.get("name").cloned().unwrap_or_default())?;
            service_start(&name)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "service.stop" => {
            let name: String = serde_json::from_value(req.params.get("name").cloned().unwrap_or_default())?;
            service_stop(&name)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "service.config" => {
            let name: String = serde_json::from_value(req.params.get("name").cloned().unwrap_or_default())?;
            service_config(&name)
        }
        "hosts.list" => hosts_list(),
        "hosts.write" => {
            let entries: Vec<wt_win32::hosts::HostsEntry> = serde_json::from_value(req.params.get("entries").cloned().unwrap_or_default())?;
            hosts_write(entries)?;
            Ok(serde_json::json!({ "ok": true }))
        }
        "repair.sfc" => sfc(),
        "repair.dism" => dism(),
        other => Err(Error::InvalidInput(format!("unknown op: {other}"))),
    }
}

fn b64_decode(s: &str) -> std::result::Result<Vec<u8>, String> {
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
        // Count trailing padding chars so the unused bits decode as 0.
        let mut n_pad = 0;
        for i in (0..4).rev() {
            if vals[i] == 64 { n_pad += 1; } else { break; }
        }
        // Pad-only positions contribute zero bits to the combined value.
        let v2 = if vals[2] == 64 { 0 } else { vals[2] as u32 };
        let v3 = if vals[3] == 64 { 0 } else { vals[3] as u32 };
        let combined = ((vals[0] as u32) << 18) | ((vals[1] as u32) << 12) | (v2 << 6) | v3;
        out.push((combined >> 16) as u8);
        if n_pad < 2 { out.push((combined >> 8) as u8); }
        if n_pad < 1 { out.push(combined as u8); }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn base64_roundtrip() {
        for s in &[b"" as &[u8], b"f", b"fo", b"foo", b"foob", b"fooba", b"foobar", b"hello world"] {
            assert_eq!(b64_decode(&b64_encode(s)).unwrap(), *s);
        }
    }
}
