//! Process enumeration and control via Toolhelp + PSAPI.

use serde::{Deserialize, Serialize};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{
    OpenProcess, SetPriorityClass, TerminateProcess, ABOVE_NORMAL_PRIORITY_CLASS,
    BELOW_NORMAL_PRIORITY_CLASS, HIGH_PRIORITY_CLASS, IDLE_PRIORITY_CLASS,
    NORMAL_PRIORITY_CLASS, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_INFORMATION,
    PROCESS_TERMINATE, REALTIME_PRIORITY_CLASS,
};
use windows::Win32::System::ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
use wt_core::{Error, Result};
use crate::util::HandleGuard;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessRow {
    pub pid: u32,
    pub name: String,
    pub parent_pid: u32,
    pub threads: u32,
    pub priority_class: u32,
    pub working_set_bytes: u64,
    pub private_bytes: u64,
    pub user: String,
    pub path: String,
}

/// Snapshot the entire process table in a single round trip.
pub fn list() -> Result<Vec<ProcessRow>> {
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }
        .map_err(|e| Error::win32(e.code().0, "CreateToolhelp32Snapshot"))?;
    let _g = HandleGuard(snapshot);
    let mut entry = PROCESSENTRY32W {
        dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
        ..Default::default()
    };
    let mut out = Vec::new();
    let mut ok = unsafe { Process32FirstW(snapshot, &mut entry) };
    while ok.is_ok() {
        let name = crate::util::wide_to_string(&entry.szExeFile);
        out.push(ProcessRow {
            pid: entry.th32ProcessID,
            name,
            parent_pid: entry.th32ParentProcessID,
            threads: entry.cntThreads,
            priority_class: entry.pcPriClassBase as u32,
            working_set_bytes: 0,
            private_bytes: 0,
            user: String::new(),
            path: String::new(),
        });
        ok = unsafe { Process32NextW(snapshot, &mut entry) };
    }
    enrich(&mut out);
    Ok(out)
}

fn enrich(rows: &mut [ProcessRow]) {
    for row in rows.iter_mut() {
        let h = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, row.pid) };
        let proc = match h {
            Ok(h) => h,
            Err(_) => continue,
        };
        let _g = HandleGuard(proc);
        let mut mem = PROCESS_MEMORY_COUNTERS {
            cb: std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
            ..Default::default()
        };
        let ok = unsafe { GetProcessMemoryInfo(proc, &mut mem, mem.cb) };
        if ok.is_ok() {
            row.working_set_bytes = mem.WorkingSetSize as u64;
            row.private_bytes = mem.PagefileUsage as u64;
        }
    }
}

pub fn kill(pid: u32, _tree: bool) -> Result<()> {
    let h = unsafe { OpenProcess(PROCESS_TERMINATE, false, pid) }
        .map_err(|e| Error::win32(e.code().0, format!("OpenProcess kill {pid}")))?;
    let _g = HandleGuard(h);
    unsafe { TerminateProcess(h, 1) }
        .map_err(|e| Error::win32(e.code().0, format!("TerminateProcess {pid}")))?;
    // TODO: walk child PIDs via Toolhelp snapshot when _tree is true.
    Ok(())
}

pub fn set_priority(pid: u32, class: &str) -> Result<()> {
    let cls = match class.to_ascii_lowercase().as_str() {
        "idle" => IDLE_PRIORITY_CLASS,
        "below_normal" => BELOW_NORMAL_PRIORITY_CLASS,
        "normal" => NORMAL_PRIORITY_CLASS,
        "above_normal" => ABOVE_NORMAL_PRIORITY_CLASS,
        "high" => HIGH_PRIORITY_CLASS,
        "realtime" => REALTIME_PRIORITY_CLASS,
        other => return Err(Error::InvalidInput(format!("unknown priority: {other}"))),
    };
    let h = unsafe { OpenProcess(PROCESS_SET_INFORMATION, false, pid) }
        .map_err(|e| Error::win32(e.code().0, format!("OpenProcess set_priority {pid}")))?;
    let _g = HandleGuard(h);
    unsafe { SetPriorityClass(h, cls) }
        .map_err(|e| Error::win32(e.code().0, format!("SetPriorityClass {pid}")))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn list_processes_nonempty() {
        let v = list().unwrap();
        assert!(!v.is_empty());
    }
    #[test]
    fn kill_nonexistent_pid_fails() {
        assert!(kill(0xFFFFFFFF, false).is_err());
    }
}
