//! Thin, safe(ish) wrappers over Win32 APIs used by WindowsTools.
//!
//! Every module in this crate is the **direct replacement** for a
//! `Command::new("powershell")` call in the legacy codebase. No shelling out.
//!
//! Modules:
//! - `system`     — OS info, uptime, username, computer name, SID
//! - `process`    — enum + read + control processes via PSAPI / Toolhelp
//! - `service`    — SCM and per-service control
//! - `registry`   — high-level registry read/write (Hive + key + values)
//! - `network`    — adapters, TCP/UDP tables, DNS, ICMP echo
//! - `disk`       — volumes, free space, type, cleanup trigger
//! - `perf`       — PDH-based CPU / memory / disk / network sampler
//! - `env`        — environment variables (per-process and registry-backed)
//! - `hosts`      — %WINDIR%\System32\drivers\etc\hosts
//! - `startup`    — HKCU/HKLM Run keys + RunOnce + startup folder
//! - `task`       — Task Scheduler 1.0 (ITaskService)
//! - `privilege`  — token / integrity / UAC helpers
//! - `launch`     — ShellExecuteW wrapper with `runas`
//! - `repair`     — SFC / DISM (streaming)
//! - `pipe`       — named-pipe server / client (used by agent <-> service)

#![cfg(windows)]
#![allow(clippy::needless_return)]

pub mod disk;
pub mod env;
pub mod hosts;
pub mod launch;
pub mod network;
pub mod perf;
pub mod pipe;
pub mod privilege;
pub mod process;
pub mod registry;
pub mod repair;
pub mod service;
pub mod startup;
pub mod system;
pub mod task;
pub mod util;

pub use wt_core as core;
