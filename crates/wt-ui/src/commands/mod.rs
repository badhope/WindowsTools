//! All `#[tauri::command]` handlers exposed to the Vue frontend.
//!
//! Each submodule corresponds to a functional area (system, processes,
//! services, etc.).  Commands are thin wrappers that route through
//! `crate::rpc` (which delegates to `wt-agent`).

pub mod disk;
pub mod hosts;
pub mod launch;
pub mod network;
pub mod palette;
pub mod performance;
pub mod processes;
pub mod registry;
pub mod repair;
pub mod services;
pub mod startup;
pub mod system;
pub mod task;

use std::collections::BTreeMap;
use wt_core::registry_path::RegistryPath;

/// Parse a `HKLM\…` / `HKCU\…` path string into a typed
/// `RegistryPath`, returning a structured error on malformed input.
pub fn parse_path(s: &str) -> wt_core::Result<RegistryPath> {
    RegistryPath::parse(s).map_err(|e| wt_core::Error::InvalidInput(e.to_string()))
}

/// Build a single `(name, value)` parameter for [`crate::rpc::params_of`].
pub fn p(name: &str, v: serde_json::Value) -> (String, serde_json::Value) {
    (name.into(), v)
}

/// Re-export of `crate::rpc::params_of` for convenience.
pub fn params<I, K, V>(pairs: I) -> BTreeMap<String, serde_json::Value>
where
    I: IntoIterator<Item = (K, V)>,
    K: Into<String>,
    V: Into<serde_json::Value>,
{
    crate::rpc::params_of(pairs)
}
