//! RPC facade: thin wrappers around `wt-agent` high-level operations.
//!
//! Most Tauri commands simply call one of these.  Operations that need
//! `SYSTEM` integrity are forwarded by `wt-agent` over the named pipe;
//! low-integrity operations run locally with no UAC prompt.

use std::collections::BTreeMap;
use wt_core::{Error, Result};

/// Invoke a `wt-agent` operation.  This is the function every Tauri
/// command routes through.
pub fn call(op: &str, params: BTreeMap<String, serde_json::Value>) -> Result<serde_json::Value> {
    wt_agent::call_service(op, params, None::<fn(&wt_core::ipc::Event)>)
}

/// Build a parameter map from `(name, value)` pairs.  Useful sugar for
/// the very common case of passing one or two scalar arguments.
pub fn params_of<I, K, V>(pairs: I) -> BTreeMap<String, serde_json::Value>
where
    I: IntoIterator<Item = (K, V)>,
    K: Into<String>,
    V: Into<serde_json::Value>,
{
    pairs.into_iter().map(|(k, v)| (k.into(), v.into())).collect()
}

/// Handle to a long-lived perf sampler.  Currently wraps a local PDH
/// sampler (kept in the Tauri process).  If we later add a "remote
/// host" mode, this can become a trait with two impls.
pub struct PerfHandle {
    inner: std::sync::Arc<wt_win32::perf::PerfSampler>,
}

impl PerfHandle {
    /// Open a new PDH query with the standard counters
    /// (CPU% / mem / disk R+W).
    pub fn new() -> Result<Self> {
        let inner = std::sync::Arc::new(wt_win32::perf::PerfSampler::new()?);
        Ok(Self { inner })
    }

    /// Read a fresh sample.
    pub fn sample(&self) -> Result<wt_win32::perf::PerfSample> {
        self.inner.sample()
    }
}

/// Convert a Win32 error code into our error type.  Thin wrapper
/// around `Error::win32` that is occasionally useful in commands.
pub fn win32(code: i32, ctx: &str) -> Error { Error::win32(code, ctx) }
