//! `task.*` commands: list and run-now scheduled tasks.

use crate::commands::params;
use crate::rpc;
use crate::types::TaskRunArgs;

#[tauri::command]
pub fn task_list() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::task::list()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn task_run_now(args: TaskRunArgs) -> wt_core::Result<()> {
    rpc::call("task.run_now", params([("name", serde_json::json!(args.name))]))?;
    Ok(())
}
