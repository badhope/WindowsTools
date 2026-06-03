//! `%WINDIR%\System32\drivers\etc\hosts` reader/writer.

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use wt_core::{Error, Result};

const HOSTS_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostsEntry {
    pub ip: String,
    pub hostname: String,
    pub comment: Option<String>,
}

pub fn path() -> PathBuf {
    PathBuf::from(HOSTS_PATH)
}

pub fn list() -> Result<Vec<HostsEntry>> {
    let content = fs::read_to_string(HOSTS_PATH).map_err(|e| Error::Io(e.to_string()))?;
    let mut out = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        // Split at the first '#' for trailing comment.
        let (core, comment) = match trimmed.find('#') {
            Some(i) => (&trimmed[..i], Some(trimmed[i..].to_string())),
            None => (trimmed, None),
        };
        // First token is IP, rest are hostnames.
        let mut it = core.split_whitespace();
        let Some(ip) = it.next() else { continue };
        for host in it {
            out.push(HostsEntry { ip: ip.to_string(), hostname: host.to_string(), comment: comment.clone() });
        }
    }
    Ok(out)
}

pub fn add(ip: &str, hostname: &str) -> Result<()> {
    let mut content = fs::read_to_string(HOSTS_PATH).map_err(|e| Error::Io(e.to_string()))?;
    content.push('\n');
    content.push_str(ip);
    content.push(' ');
    content.push_str(hostname);
    content.push('\n');
    write_atomic(&content)
}

pub fn remove(ip: &str, hostname: &str) -> Result<()> {
    let content = fs::read_to_string(HOSTS_PATH).map_err(|e| Error::Io(e.to_string()))?;
    let mut out = String::with_capacity(content.len());
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            out.push_str(line);
            out.push('\n');
            continue;
        }
        let mut it = trimmed.split_whitespace();
        let Some(this_ip) = it.next() else { out.push_str(line); out.push('\n'); continue };
        let mut hosts = it.collect::<Vec<_>>();
        let mut matched = this_ip == ip && hosts.iter().any(|h| *h == hostname);
        if matched {
            hosts.retain(|h| *h != hostname);
        }
        if matched && hosts.is_empty() {
            // Drop the line.
            continue;
        }
        out.push_str(this_ip);
        for h in &hosts {
            out.push(' ');
            out.push_str(h);
        }
        if let Some(ci) = line.find('#') {
            out.push(' ');
            out.push_str(&line[ci..]);
        }
        out.push('\n');
    }
    write_atomic(&out)
}

/// Replace the entire hosts file with a header + the given entries.
pub fn write_entries(entries: &[HostsEntry]) -> Result<()> {
    let mut s = String::new();
    s.push_str("# Managed by WindowsTools — do not edit.\r\n");
    s.push_str("127.0.0.1       localhost\r\n");
    s.push_str("::1             localhost\r\n");
    s.push_str("\r\n");
    for e in entries {
        s.push_str(&e.ip);
        s.push('\t');
        s.push_str(&e.hostname);
        if let Some(c) = &e.comment {
            if !c.is_empty() {
                s.push('\t');
                s.push_str("# ");
                s.push_str(c);
            }
        }
        s.push_str("\r\n");
    }
    write_atomic(&s)
}

/// Atomic write: write to a temp file in the same dir, then rename.
fn write_atomic(content: &str) -> Result<()> {
    let path = PathBuf::from(HOSTS_PATH);
    let tmp = path.with_extension("hosts.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| Error::Io(e.to_string()))?;
        f.write_all(content.as_bytes()).map_err(|e| Error::Io(e.to_string()))?;
        f.sync_all().map_err(|e| Error::Io(e.to_string()))?;
    }
    fs::rename(&tmp, &path).map_err(|e| Error::Io(e.to_string()))?;
    Ok(())
}
