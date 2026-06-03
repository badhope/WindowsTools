//! `system.*` commands: identity, version, env vars, integrity.

use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub fn ping() -> serde_json::Value {
    serde_json::json!({ "pong": true, "service": "wt-ui" })
}

#[tauri::command]
pub fn whoami() -> wt_core::Result<serde_json::Value> {
    let sid = wt_win32::privilege::user_sid().unwrap_or_default();
    let integrity = wt_win32::privilege::integrity_level().ok();
    let elevated = wt_win32::privilege::is_elevated();
    let user = std::env::var("USERNAME").unwrap_or_default();
    Ok(serde_json::json!({
        "user": user,
        "sid": sid,
        "integrity": integrity,
        "elevated": elevated,
    }))
}

#[tauri::command]
pub fn system_info() -> wt_core::Result<serde_json::Value> {
    let snap = wt_win32::system::snapshot()?;
    serde_json::to_value(snap).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn system_integrity() -> wt_core::Result<serde_json::Value> {
    let i = wt_win32::privilege::integrity_level()?;
    Ok(serde_json::json!({
        "integrity": i,
        "label": wt_win32::privilege::integrity_label(i),
        "elevated": wt_win32::privilege::is_elevated(),
    }))
}

#[tauri::command]
pub fn system_env(name: Option<String>) -> wt_core::Result<serde_json::Value> {
    match name {
        Some(n) => {
            let v = std::env::var(&n).map_err(|e| {
                wt_core::Error::Other(format!("env var {n} not found: {e}"))
            })?;
            Ok(serde_json::json!({ n: v }))
        }
        None => Ok(serde_json::json!(wt_win32::env::list_process())),
    }
}

#[tauri::command]
pub fn system_set_env(_state: State<'_, AppState>, args: crate::types::SetEnvArgs) -> wt_core::Result<()> {
    match args.scope.as_str() {
        "user"    => wt_win32::env::set_user(&args.name, &args.value),
        "process" => { wt_win32::env::set_process(&args.name, &args.value); Ok(()) },
        other     => Err(wt_core::Error::InvalidInput(format!("unknown scope: {other}"))),
    }
}
