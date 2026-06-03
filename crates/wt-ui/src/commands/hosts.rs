//! `hosts.*` commands: list and write the system hosts file.

use crate::types::HostsWriteArgs;

#[tauri::command]
pub fn hosts_list() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::hosts::list()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn hosts_write(args: HostsWriteArgs) -> wt_core::Result<()> {
    let entries: Vec<wt_win32::hosts::HostsEntry> = args.entries.into_iter()
        .map(crate::types::HostsEntryWire::into)
        .collect();
    wt_win32::hosts::write_entries(&entries)
}
