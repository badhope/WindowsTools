//! `disk.*` commands.

#[tauri::command]
pub fn disk_drives() -> wt_core::Result<serde_json::Value> {
    let v = wt_win32::disk::list()?;
    serde_json::to_value(v).map_err(wt_core::Error::from)
}

#[tauri::command]
pub fn disk_free(path: String) -> wt_core::Result<serde_json::Value> {
    let vols = wt_win32::disk::list()?;
    let needle = path.trim_end_matches('\\').to_lowercase();
    let v = vols.into_iter()
        .find(|v| v.mount_point.trim_end_matches('\\').to_lowercase() == needle
             || v.mount_point[..1].to_lowercase() == needle[..1].to_lowercase())
        .ok_or_else(|| wt_core::Error::NotFound { resource: format!("volume: {path}") })?;
    Ok(serde_json::json!({
        "mount_point": v.mount_point,
        "label": v.label,
        "fs": v.fs,
        "total_bytes": v.total_bytes,
        "free_bytes": v.free_bytes,
        "kind": v.kind,
    }))
}
