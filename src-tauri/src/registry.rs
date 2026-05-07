use crate::{RegistryValue, utils};
use winreg::RegKey;
use winreg::enums::*;
use std::process::Command;

pub fn get_registry_tree() -> Result<Vec<serde_json::Value>, String> {
    let roots = vec![
        ("HKEY_CLASSES_ROOT", HKEY_CLASSES_ROOT),
        ("HKEY_CURRENT_USER", HKEY_CURRENT_USER),
        ("HKEY_LOCAL_MACHINE\\SOFTWARE", HKEY_LOCAL_MACHINE),
        ("HKEY_LOCAL_MACHINE\\SYSTEM", HKEY_LOCAL_MACHINE),
        ("HKEY_USERS", HKEY_USERS),
        ("HKEY_CURRENT_CONFIG", HKEY_CURRENT_CONFIG),
    ];

    let mut tree = Vec::new();
    
    for (name, hkey) in roots {
        let key = RegKey::predef(hkey);
        let path = if name.contains('\\') {
            name.split('\\').nth(1).unwrap_or("")
        } else {
            ""
        };
        
        let children = if path.is_empty() {
            get_subkeys_shallow(&key, name)
        } else {
            match key.open_subkey(path) {
                Ok(subkey) => get_subkeys_shallow(&subkey, name),
                Err(_) => Vec::new()
            }
        };
        
        tree.push(serde_json::json!({
            "name": name,
            "path": name,
            "isRoot": !name.contains('\\'),
            "requiresAdmin": name.starts_with("HKEY_LOCAL_MACHINE"),
            "children": children,
            "hasChildren": !children.is_empty()
        }));
    }

    Ok(tree)
}

fn get_subkeys_shallow(key: &RegKey, path: &str) -> Vec<serde_json::Value> {
    let mut children = Vec::new();
    
    for subkey in key.enum_keys().filter_map(|k| k.ok()).take(50) {
        let child_path = format!("{}\\{}", path, subkey);
        let has_children = check_has_children(key, &subkey);
        
        children.push(serde_json::json!({
            "name": subkey,
            "path": child_path,
            "requiresAdmin": child_path.starts_with("HKEY_LOCAL_MACHINE"),
            "hasChildren": has_children
        }));
    }

    children
}

fn check_has_children(parent: &RegKey, name: &str) -> bool {
    match parent.open_subkey(name) {
        Ok(child_key) => child_key.enum_keys().next().is_some(),
        Err(_) => false,
    }
}

pub fn get_registry_subkeys(path: &str) -> Result<Vec<serde_json::Value>, String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    let key = RegKey::predef(hkey);
    
    let key = key.open_subkey_with_flags(subpath, KEY_READ)
        .map_err(|e| format!("打开注册表项失败: {} (可能需要管理员权限)", e))?;

    let mut children = Vec::new();
    
    for subkey in key.enum_keys().filter_map(|k| k.ok()).take(100) {
        let child_path = format!("{}\\{}", path, subkey);
        let has_children = check_has_children(&key, &subkey);
        
        children.push(serde_json::json!({
            "name": subkey,
            "path": child_path,
            "requiresAdmin": child_path.starts_with("HKEY_LOCAL_MACHINE"),
            "hasChildren": has_children
        }));
    }

    Ok(children)
}

pub fn get_registry_values(path: &str) -> Result<Vec<RegistryValue>, String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    let key = RegKey::predef(hkey);
    
    let key = key.open_subkey_with_flags(subpath, KEY_READ)
        .map_err(|e| format!("打开注册表项失败: {} (可能需要管理员权限)", e))?;

    let mut values = Vec::new();

    for (name, value) in key.enum_values().filter_map(|v| v.ok()) {
        let (value_type, value_str) = match value {
            winreg::RegValue { vtype, bytes } => {
                let type_str = match vtype {
                    REG_SZ => "REG_SZ",
                    REG_EXPAND_SZ => "REG_EXPAND_SZ",
                    REG_BINARY => "REG_BINARY",
                    REG_DWORD => "REG_DWORD",
                    REG_DWORD_BIG_ENDIAN => "REG_DWORD_BIG_ENDIAN",
                    REG_LINK => "REG_LINK",
                    REG_MULTI_SZ => "REG_MULTI_SZ",
                    REG_NONE => "REG_NONE",
                    REG_QWORD => "REG_QWORD",
                    _ => "UNKNOWN",
                };

                let val_str = match vtype {
                    REG_SZ | REG_EXPAND_SZ => {
                        String::from_utf16_lossy(
                            &bytes.chunks(2)
                                .map(|chunk| {
                                    if chunk.len() == 2 {
                                        u16::from_le_bytes([chunk[0], chunk[1]])
                                    } else {
                                        0
                                    }
                                })
                                .collect::<Vec<u16>>()
                        ).trim_end_matches('\0').to_string()
                    }
                    REG_DWORD => {
                        if bytes.len() >= 4 {
                            format!("{}", u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
                        } else {
                            "0".to_string()
                        }
                    }
                    REG_QWORD => {
                        if bytes.len() >= 8 {
                            format!("{}", u64::from_le_bytes([
                                bytes[0], bytes[1], bytes[2], bytes[3],
                                bytes[4], bytes[5], bytes[6], bytes[7]
                            ]))
                        } else {
                            "0".to_string()
                        }
                    }
                    REG_MULTI_SZ => {
                        let strings: Vec<String> = bytes.chunks(2)
                            .map(|chunk| {
                                if chunk.len() == 2 {
                                    u16::from_le_bytes([chunk[0], chunk[1]])
                                } else {
                                    0
                                }
                            })
                            .collect::<Vec<u16>>()
                            .split(|&c| c == 0)
                            .filter(|s| !s.is_empty())
                            .map(|s| String::from_utf16_lossy(s))
                            .collect();
                        strings.join("; ")
                    }
                    _ => format!("{:?}", bytes),
                };

                (type_str.to_string(), val_str)
            }
        };

        values.push(RegistryValue {
            name: if name.is_empty() { "(默认)".to_string() } else { name },
            value_type,
            value: value_str,
        });
    }

    Ok(values)
}

pub fn set_registry_value(path: &str, name: &str, value_type: &str, value: &str) -> Result<(), String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    
    if subpath.starts_with("SOFTWARE\\") || subpath.starts_with("SYSTEM\\") {
        return Err(format!(
            "修改 '{}' 需要管理员权限。\n\n提示：\n1. 右键点击程序图标，选择'以管理员身份运行'\n2. 或使用PowerShell命令手动修改：reg add \"{}\" /v \"{}\" /t {} /d \"{}\" /f",
            path, path, name, value_type, value
        ));
    }
    
    let key = RegKey::predef(hkey);
    
    let key = key.open_subkey_with_flags(subpath, KEY_SET_VALUE)
        .map_err(|e| format!("打开注册表项失败: {} (可能需要管理员权限)", e))?;

    match value_type {
        "REG_SZ" | "REG_EXPAND_SZ" => {
            key.set_value(name, &value)
                .map_err(|e| format!("设置值失败: {} (可能需要管理员权限)", e))?;
        }
        "REG_DWORD" => {
            let val: u32 = value.parse().unwrap_or(0);
            key.set_value(name, &val)
                .map_err(|e| format!("设置值失败: {} (可能需要管理员权限)", e))?;
        }
        "REG_QWORD" => {
            let val: u64 = value.parse().unwrap_or(0);
            key.set_value(name, &val)
                .map_err(|e| format!("设置值失败: {} (可能需要管理员权限)", e))?;
        }
        "REG_MULTI_SZ" => {
            let strings: Vec<&str> = value.split(';').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
            key.set_value(name, &strings)
                .map_err(|e| format!("设置值失败: {} (可能需要管理员权限)", e))?;
        }
        "REG_BINARY" => {
            let bytes: Vec<u8> = value.split_whitespace()
                .filter_map(|s| u8::from_str_radix(s, 16).ok())
                .collect();
            key.set_raw_value(name, &winreg::RegValue {
                bytes,
                vtype: REG_BINARY
            }).map_err(|e| format!("设置值失败: {}", e))?;
        }
        _ => {
            key.set_value(name, &value)
                .map_err(|e| format!("设置值失败: {} (可能需要管理员权限)", e))?;
        }
    }

    Ok(())
}

pub fn create_registry_value(path: &str, name: &str, value_type: &str, value: &str) -> Result<(), String> {
    set_registry_value(path, name, value_type, value)
}

pub fn delete_registry_value(path: &str, name: &str) -> Result<(), String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    
    if subpath.starts_with("SOFTWARE\\") || subpath.starts_with("SYSTEM\\") {
        return Err(format!(
            "删除 '{}' 下的 '{}' 需要管理员权限。\n\n提示：请以管理员身份运行程序，或使用命令提示符手动删除。",
            path, name
        ));
    }
    
    let key = RegKey::predef(hkey);
    
    let key = key.open_subkey_with_flags(subpath, KEY_SET_VALUE)
        .map_err(|e| format!("打开注册表项失败: {} (可能需要管理员权限)", e))?;

    key.delete_value(name)
        .map_err(|e| format!("删除值失败: {} (可能需要管理员权限)", e))?;

    Ok(())
}

pub fn export_registry_key(path: &str) -> Result<String, String> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &format!(
                "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; reg export \"{}\" - 2>&1",
                path
            )
        ])
        .output()
        .map_err(|e| format!("导出注册表失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("导出失败: {}", error));
    }

    Ok(utils::decode_output(&output.stdout))
}

pub fn create_registry_key(path: &str, name: &str) -> Result<(), String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    let key = RegKey::predef(hkey);
    
    let parent_key = key.open_subkey_with_flags(subpath, KEY_CREATE_SUB_KEY)
        .map_err(|e| format!("无法创建注册表项: {} (可能需要管理员权限)", e))?;
    
    parent_key.create_subkey(name)
        .map_err(|e| format!("创建注册表项失败: {}", e))?;
    
    Ok(())
}

pub fn delete_registry_key(path: &str) -> Result<(), String> {
    let (hkey, subpath) = parse_registry_path(path)?;
    
    let parts: Vec<&str> = subpath.rsplitn(2, '\\').collect();
    if parts.len() != 2 {
        return Err("无效的注册表路径".to_string());
    }
    
    let (parent_path, key_name) = (parts[1], parts[0]);
    
    if parent_path.starts_with("SOFTWARE") || parent_path.starts_with("SYSTEM") || 
       parent_path.starts_with("HARDWARE") {
        return Err(format!(
            "删除 '{}' 需要管理员权限。\n\n提示：请以管理员身份运行程序。",
            path
        ));
    }
    
    let key = RegKey::predef(hkey);
    
    let parent_key = key.open_subkey_with_flags(parent_path, KEY_WRITE)
        .map_err(|e| format!("无法打开父注册表项: {}", e))?;
    
    parent_key.delete_subkey_all(key_name)
        .map_err(|e| format!("删除注册表项失败: {}", e))?;
    
    Ok(())
}

fn parse_registry_path(path: &str) -> Result<(isize, &str), String> {
    let (root, subpath) = path.split_once('\\')
        .ok_or_else(|| format!("无效的注册表路径: {}", path))?;

    let hkey = match root {
        "HKEY_CLASSES_ROOT" | "HKCR" => HKEY_CLASSES_ROOT,
        "HKEY_CURRENT_USER" | "HKCU" => HKEY_CURRENT_USER,
        "HKEY_LOCAL_MACHINE" | "HKLM" => HKEY_LOCAL_MACHINE,
        "HKEY_USERS" | "HKU" => HKEY_USERS,
        "HKEY_CURRENT_CONFIG" | "HKCC" => HKEY_CURRENT_CONFIG,
        _ => return Err(format!("未知的注册表根项: {}", root)),
    };

    Ok((hkey, subpath))
}
