//! `network.*` commands: TCP connection table, UDP endpoints.

#[tauri::command]
pub fn network_adapters() -> wt_core::Result<serde_json::Value> {
    Ok(serde_json::json!({"adapters": []}))
}

#[tauri::command]
pub fn network_tcp_table() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::network::tcp_connections()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn network_udp_table() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::network::udp_endpoints()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}
