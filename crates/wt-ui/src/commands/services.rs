//! `services.*` commands: list, config, start/stop, set start-type.

use crate::types::ServiceSetStartArgs;

#[tauri::command]
pub fn services_list() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::service::list_status_only()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn services_config(name: String) -> wt_core::Result<serde_json::Value> {
    let c = wt_win32::service::config_of(&name)?;
    serde_json::to_value(c).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn services_start(name: String) -> wt_core::Result<()> {
    wt_win32::service::control(&name, "start")?;
    Ok(())
}

#[tauri::command]
pub fn services_stop(name: String) -> wt_core::Result<()> {
    wt_win32::service::control(&name, "stop")?;
    Ok(())
}

#[tauri::command]
pub fn services_set_start_type(args: ServiceSetStartArgs) -> wt_core::Result<()> {
    wt_win32::service::set_start_type(&args.name, &args.start_type)?;
    Ok(())
}
