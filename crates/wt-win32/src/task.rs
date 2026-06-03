//! Task Scheduler 1.0 wrapper. Minimal implementation that uses schtasks.exe
//! as a fallback when COM bindings are too painful. (The legacy code used
//! `Get-ScheduledTask`, so this is no worse than the original — but with
//! zero PowerShell.)

use serde::{Deserialize, Serialize};
use std::process::Command;
use wt_core::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRow {
    pub name: String,
    pub path: String,
    pub state: String,
    pub last_run: String,
    pub next_run: String,
}

pub fn list() -> Result<Vec<TaskRow>> {
    let out = Command::new("schtasks")
        .args(["/Query", "/FO", "CSV", "/NH", "/V"])
        .output()
        .map_err(|e| wt_core::Error::Other(format!("schtasks: {e}")))?;
    if !out.status.success() {
        return Ok(Vec::new());
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let mut tasks = Vec::new();
    for line in text.lines() {
        // CSV columns include HostName, TaskName, NextRunTime, Status, ...
        // Be defensive: we just take the first 5 fields.
        let fields: Vec<&str> = line.split(',').map(|s| s.trim_matches('"')).collect();
        if fields.len() < 5 {
            continue;
        }
        tasks.push(TaskRow {
            name: fields.get(1).unwrap_or(&"").to_string(),
            path: String::new(),
            state: fields.get(3).unwrap_or(&"").to_string(),
            last_run: String::new(),
            next_run: fields.get(2).unwrap_or(&"").to_string(),
        });
    }
    Ok(tasks)
}

pub fn run(name: &str) -> Result<()> {
    let s = Command::new("schtasks")
        .args(["/Run", "/TN", name])
        .status()
        .map_err(|e| wt_core::Error::Other(format!("schtasks /Run: {e}")))?;
    if !s.success() { return Err(wt_core::Error::Other(format!("schtasks /Run {name} failed"))); }
    Ok(())
}

pub fn disable(name: &str) -> Result<()> {
    let s = Command::new("schtasks")
        .args(["/Change", "/TN", name, "/DISABLE"])
        .status()
        .map_err(|e| wt_core::Error::Other(format!("schtasks /Change: {e}")))?;
    if !s.success() { return Err(wt_core::Error::Other(format!("schtasks /Change {name} failed"))); }
    Ok(())
}
