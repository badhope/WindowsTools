//! `repair.*` commands: SFC and DISM wrappers.

use crate::rpc;

#[tauri::command]
pub fn repair_sfc() -> wt_core::Result<serde_json::Value> {
    rpc::call("repair.sfc", Default::default())
}

#[tauri::command]
pub fn repair_dism() -> wt_core::Result<serde_json::Value> {
    rpc::call("repair.dism", Default::default())
}
