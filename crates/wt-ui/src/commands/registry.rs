//! `registry.*` commands.

use crate::commands::{params, parse_path};
use crate::rpc;
use crate::types::RegistryPathArgs;

#[tauri::command]
pub fn registry_get(path: String, name: String) -> wt_core::Result<serde_json::Value> {
    let p = parse_path(&path)?;
    let v = wt_agent::registry_get(&p, &name)?;
    Ok(v)
}

#[tauri::command]
pub fn registry_set(args: crate::types::RegistrySetArgs) -> wt_core::Result<()> {
    let p = parse_path(&args.path)?;
    rpc::call("registry.set_value", params([
        ("path",     serde_json::json!(p)),
        ("name",     serde_json::json!(args.name)),
        ("kind",     serde_json::json!(args.kind)),
        ("data_b64", serde_json::json!(args.data_b64)),
    ]))?;
    Ok(())
}

#[tauri::command]
pub fn registry_delete_value(args: RegistryPathArgs) -> wt_core::Result<()> {
    let p = parse_path(&args.path)?;
    let name = args.name.as_deref()
        .ok_or_else(|| wt_core::Error::InvalidInput("registry.delete_value requires a `name`".into()))?;
    rpc::call("registry.delete_value", params([
        ("path", serde_json::json!(p)),
        ("name", serde_json::json!(name)),
    ]))?;
    Ok(())
}

#[tauri::command]
pub fn registry_delete_tree(args: RegistryPathArgs) -> wt_core::Result<()> {
    let p = parse_path(&args.path)?;
    rpc::call("registry.delete_tree", params([
        ("path", serde_json::json!(p)),
    ]))?;
    Ok(())
}

#[tauri::command]
pub fn registry_list_subkeys(args: RegistryPathArgs) -> wt_core::Result<Vec<String>> {
    let p = parse_path(&args.path)?;
    let k = wt_win32::registry::open_path(&p, false)?;
    wt_win32::registry::enum_subkeys(&k)
}
