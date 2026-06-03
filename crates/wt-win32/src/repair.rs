//! System repair: SFC and DISM with progress streaming.
//!
//! These are inherently long-running and benefit from real-time feedback.
//! We invoke them as child processes and parse their stdout for percent
//! progress, which we surface to the caller via a channel.

use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Arc;
use parking_lot::Mutex;
use std::time::Duration;
use wt_core::{Error, Result};

/// Cancel a running repair.
#[derive(Clone, Default)]
pub struct Cancel(Arc<Mutex<bool>>);
impl Cancel {
    pub fn new() -> Self { Self::default() }
    pub fn cancel(&self) { *self.0.lock() = true; }
    pub fn is_cancelled(&self) -> bool { *self.0.lock() }
}

/// Run `sfc /scannow` with a progress callback.
pub fn sfc<F: FnMut(f32, &str)>(cancel: Cancel, mut progress: F) -> Result<()> {
    let mut child = Command::new("sfc")
        .arg("/scannow")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| Error::Other(format!("spawn sfc: {e}")))?;
    let stdout = child.stdout.take().ok_or_else(|| Error::Other("no stdout".into()))?;
    let reader = BufReader::new(stdout);
    for line in reader.lines().map_while(std::io::Result::ok) {
        if cancel.is_cancelled() {
            let _ = child.kill();
            return Err(Error::Cancelled);
        }
        let pct = parse_sfc_percent(&line);
        progress(pct, &line);
    }
    let status = child.wait().map_err(|e| Error::Other(format!("wait sfc: {e}")))?;
    if !status.success() {
        return Err(Error::Other(format!("sfc exited {status:?}")));
    }
    Ok(())
}

/// Run `dism /online /cleanup-image /restorehealth` with a progress callback.
pub fn dism<F: FnMut(f32, &str)>(cancel: Cancel, mut progress: F) -> Result<()> {
    let mut child = Command::new("dism")
        .arg("/online")
        .arg("/cleanup-image")
        .arg("/restorehealth")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| Error::Other(format!("spawn dism: {e}")))?;
    let stdout = child.stdout.take().ok_or_else(|| Error::Other("no stdout".into()))?;
    let reader = BufReader::new(stdout);
    for line in reader.lines().map_while(std::io::Result::ok) {
        if cancel.is_cancelled() {
            let _ = child.kill();
            return Err(Error::Cancelled);
        }
        let pct = parse_dism_percent(&line);
        progress(pct, &line);
    }
    let status = child.wait().map_err(|e| Error::Other(format!("wait dism: {e}")))?;
    if !status.success() {
        return Err(Error::Other(format!("dism exited {status:?}")));
    }
    Ok(())
}

fn parse_sfc_percent(line: &str) -> f32 {
    if let Some(p) = line.find('%') {
        let start = line[..p].rfind(|c: char| !c.is_ascii_digit() && c != '.').map(|i| i + 1).unwrap_or(0);
        if let Ok(v) = line[start..p].parse::<f32>() {
            return v;
        }
    }
    -1.0
}

fn parse_dism_percent(line: &str) -> f32 {
    if let Some(p) = line.find('%') {
        let bytes = line.as_bytes();
        let mut start = p;
        while start > 0 && (bytes[start - 1].is_ascii_digit() || bytes[start - 1] == b'.') {
            start -= 1;
        }
        if let Ok(v) = line[start..p].parse::<f32>() {
            return v;
        }
    }
    -1.0
}

#[allow(dead_code)]
pub fn sleep_ms(ms: u64) {
    std::thread::sleep(Duration::from_millis(ms));
}
