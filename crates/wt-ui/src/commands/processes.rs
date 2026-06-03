//! `processes.*` commands.

use crate::types::KillArgs;

#[tauri::command]
pub fn processes_list() -> wt_core::Result<Vec<serde_json::Value>> {
    let rows = wt_win32::process::list()?;
    rows.into_iter()
        .map(|r| serde_json::to_value(r).map_err(wt_core::Error::from))
        .collect()
}

#[tauri::command]
pub fn processes_kill(args: KillArgs) -> wt_core::Result<()> {
    wt_win32::process::kill(args.pid, args.tree)
}
