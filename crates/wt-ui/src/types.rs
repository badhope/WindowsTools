//! Type definitions for command arguments and responses.

use serde::{Deserialize, Serialize};

/// `system.set_env` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct SetEnvArgs {
    pub name: String,
    pub value: String,
    /// `"user"` (HKCU\Environment) or `"process"` (current process only).
    pub scope: String,
}

/// `processes.kill` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct KillArgs {
    pub pid: u32,
    /// Kill the entire process tree.
    #[serde(default)]
    pub tree: bool,
}

/// `registry.set` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct RegistrySetArgs {
    pub path: String,
    pub name: String,
    /// One of: "sz", "expand_sz", "dword", "qword", "multi_sz", "binary".
    pub kind: String,
    /// Base64-encoded raw bytes (UTF-8 for sz/expand_sz, UTF-16LE for multi_sz).
    pub data_b64: String,
}

/// `registry.delete_value` and `registry.delete_tree` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct RegistryPathArgs {
    pub path: String,
    #[serde(default)]
    pub name: Option<String>,
}

/// `services.set_start_type` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct ServiceSetStartArgs {
    pub name: String,
    /// One of: "boot" | "system" | "auto" | "demand" | "disabled".
    pub start_type: String,
}

/// `startup.enable` / `startup.disable` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct StartupToggleArgs {
    pub name: String,
    #[serde(default)]
    pub command: String,
    /// One of: "hkcu_run" | "hklm_run" | "hkcu_run_once" | "hklm_run_once" | "startup_folder".
    pub source: String,
}

/// `hosts.write` parameters.  Maps one IP to one or more hostnames; the
/// frontend can group by IP and send one entry per (ip, hostname) pair.
#[derive(Debug, Clone, Deserialize)]
pub struct HostsWriteArgs {
    pub entries: Vec<HostsEntryWire>,
}

/// `launch.run` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct LaunchArgs {
    pub path: String,
    #[serde(default)]
    pub args: String,
    #[serde(default)]
    pub runas: bool,
}

/// `task.run_now` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct TaskRunArgs {
    pub name: String,
}

/// `palette.search` parameters.
#[derive(Debug, Clone, Deserialize)]
pub struct PaletteSearchArgs {
    pub q: String,
    #[serde(default = "default_limit")]
    pub limit: usize,
}
fn default_limit() -> usize { 20 }

/// Generic Ok wrapper.
#[derive(Debug, Clone, Serialize)]
pub struct OkResponse { pub ok: bool }

/// Wire form of a hosts-file entry sent from the frontend.
/// `hostname` is a single name, but the frontend can send multiple
/// `HostsEntryWire` items with the same `ip` to encode multiple hostnames.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostsEntryWire {
    pub ip: String,
    pub hostname: String,
    #[serde(default)]
    pub comment: Option<String>,
}

impl From<HostsEntryWire> for wt_win32::hosts::HostsEntry {
    fn from(w: HostsEntryWire) -> Self {
        wt_win32::hosts::HostsEntry {
            ip: w.ip,
            hostname: w.hostname,
            comment: w.comment,
        }
    }
}
