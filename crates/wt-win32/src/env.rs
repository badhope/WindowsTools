//! Environment variables: read per-process, expand %FOO%, write per-process.
//!
//! Per-user / system persistent env vars are stored in the registry
//! (`HKCU\Environment` and `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment`)
//! and need a `WM_SETTINGCHANGE` broadcast to apply to new processes.

use serde::{Deserialize, Serialize};
use std::env;
use wt_core::Result;
use crate::registry::{self, Hive, ValueData};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub name: String,
    pub value: String,
    pub scope: EnvScope,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnvScope {
    /// User-level registry-backed var.
    User,
    /// System-level registry-backed var.
    System,
    /// Per-process (current process only).
    Process,
}

pub fn list_process() -> Vec<EnvVar> {
    env::vars()
        .map(|(k, v)| EnvVar { name: k, value: v, scope: EnvScope::Process })
        .collect()
}

pub fn list_user() -> Result<Vec<EnvVar>> {
    let k = registry::open_key(Hive::CurrentUser, r"Environment", false)?;
    let mut out = Vec::new();
    for v in registry::enum_values(&k)? {
        if let ValueData::Sz(s) | ValueData::ExpandSz(s) = v.data {
            out.push(EnvVar { name: v.name, value: s, scope: EnvScope::User });
        }
    }
    Ok(out)
}

pub fn list_system() -> Result<Vec<EnvVar>> {
    let k = registry::open_key(Hive::LocalMachine, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment", false)?;
    let mut out = Vec::new();
    for v in registry::enum_values(&k)? {
        if let ValueData::Sz(s) | ValueData::ExpandSz(s) = v.data {
            out.push(EnvVar { name: v.name, value: s, scope: EnvScope::System });
        }
    }
    Ok(out)
}

pub fn set_process(name: &str, value: &str) {
    env::set_var(name, value);
}

pub fn unset_process(name: &str) {
    env::remove_var(name);
}

pub fn set_user(name: &str, value: &str) -> Result<()> {
    let k = registry::open_key(Hive::CurrentUser, r"Environment", true)?;
    registry::write_value(&k, name, &ValueData::ExpandSz(value.to_string()))?;
    Ok(())
}

pub fn delete_user(name: &str) -> Result<()> {
    let k = registry::open_key(Hive::CurrentUser, r"Environment", true)?;
    registry::delete_value(&k, name)
}

pub fn set_system(name: &str, value: &str) -> Result<()> {
    let k = registry::open_key(Hive::LocalMachine, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment", true)?;
    registry::write_value(&k, name, &ValueData::ExpandSz(value.to_string()))?;
    Ok(())
}

pub fn delete_system(name: &str) -> Result<()> {
    let k = registry::open_key(Hive::LocalMachine, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment", true)?;
    registry::delete_value(&k, name)
}
