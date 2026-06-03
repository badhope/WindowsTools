//! `startup.*` commands.

use crate::types::StartupToggleArgs;

#[tauri::command]
pub fn startup_list() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::startup::list()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn startup_enable(args: StartupToggleArgs) -> wt_core::Result<()> {
    match args.source.as_str() {
        "hkcu_run" => wt_win32::startup::enable_hkcu_run(&args.name, &args.command),
        other      => Err(wt_core::Error::InvalidInput(format!("startup_enable: unsupported source {other}"))),
    }
}

#[tauri::command]
pub fn startup_disable(args: StartupToggleArgs) -> wt_core::Result<()> {
    match args.source.as_str() {
        "hkcu_run" => wt_win32::startup::disable_hkcu_run(&args.name),
        other      => Err(wt_core::Error::InvalidInput(format!("startup_disable: unsupported source {other}"))),
    }
}
