//! Startup items: HKCU/HKLM Run, RunOnce, plus the Startup folder.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use wt_core::Result;
use crate::registry::{self, Hive, ValueData};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub source: StartupSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StartupSource {
    /// `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
    HkcuRun,
    /// `HKLM\Software\Microsoft\Windows\CurrentVersion\Run`
    HklmRun,
    /// `HKCU\...\RunOnce`
    HkcuRunOnce,
    /// `HKLM\...\RunOnce`
    HklmRunOnce,
    /// `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` (file)
    StartupFolder,
}

pub fn list() -> Result<Vec<StartupItem>> {
    let mut out = Vec::new();
    out.extend(read_run_key(Hive::CurrentUser, r"Software\Microsoft\Windows\CurrentVersion\Run", StartupSource::HkcuRun)?);
    out.extend(read_run_key(Hive::LocalMachine, r"Software\Microsoft\Windows\CurrentVersion\Run", StartupSource::HklmRun)?);
    out.extend(read_run_key(Hive::CurrentUser, r"Software\Microsoft\Windows\CurrentVersion\RunOnce", StartupSource::HkcuRunOnce)?);
    out.extend(read_run_key(Hive::LocalMachine, r"Software\Microsoft\Windows\CurrentVersion\RunOnce", StartupSource::HklmRunOnce)?);
    out.extend(read_startup_folder()?);
    Ok(out)
}

fn read_run_key(hive: Hive, sub: &str, src: StartupSource) -> Result<Vec<StartupItem>> {
    let k = match registry::open_key(hive, sub, false) {
        Ok(k) => k,
        Err(_) => return Ok(Vec::new()),
    };
    let mut out = Vec::new();
    for v in registry::enum_values(&k)? {
        if let ValueData::Sz(s) | ValueData::ExpandSz(s) = v.data {
            out.push(StartupItem {
                name: v.name.clone(),
                command: s,
                location: format!("{}\\{}", hive.long_name(), sub),
                enabled: true,
                source: src,
            });
        }
    }
    Ok(out)
}

fn read_startup_folder() -> Result<Vec<StartupItem>> {
    let roaming = std::env::var("APPDATA").unwrap_or_default();
    if roaming.is_empty() {
        return Ok(Vec::new());
    }
    let dir = PathBuf::from(roaming).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
    let mut out = Vec::new();
    if let Ok(read) = std::fs::read_dir(&dir) {
        for e in read.flatten() {
            let p = e.path();
            if p.is_file() {
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    out.push(StartupItem {
                        name: name.to_string(),
                        command: p.to_string_lossy().to_string(),
                        location: dir.to_string_lossy().to_string(),
                        enabled: true,
                        source: StartupSource::StartupFolder,
                    });
                }
            }
        }
    }
    Ok(out)
}

pub fn enable_hkcu_run(name: &str, command: &str) -> Result<()> {
    let k = registry::open_key(Hive::CurrentUser, r"Software\Microsoft\Windows\CurrentVersion\Run", true)?;
    registry::write_value(&k, name, &ValueData::Sz(command.to_string()))
}

pub fn disable_hkcu_run(name: &str) -> Result<()> {
    let k = registry::open_key(Hive::CurrentUser, r"Software\Microsoft\Windows\CurrentVersion\Run", true)?;
    registry::delete_value(&k, name)
}
