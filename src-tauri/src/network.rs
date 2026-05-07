use crate::{NetworkConnection, NetworkAdapter, utils};
use std::collections::HashMap;
use std::process::Command;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| format!("获取网络连接失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    let mut connections = Vec::new();

    let process_names = get_process_name_map();

    for line in output_str.lines() {
        let line = line.trim();
        if line.starts_with("TCP") || line.starts_with("UDP") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 {
                let protocol = parts[0];
                let local_addr = parts[1];
                let remote_addr = parts[2];
                let state = if protocol == "TCP" { parts[3] } else { "LISTENING" };
                
                let pid_str = if protocol == "TCP" {
                    parts.get(4).unwrap_or(&"0")
                } else {
                    parts.get(3).unwrap_or(&"0")
                };
                
                let pid: u32 = pid_str.parse().unwrap_or(0);
                
                let (local_ip, local_port) = parse_address(local_addr);
                let (remote_ip, remote_port) = parse_address(remote_addr);

                connections.push(NetworkConnection {
                    protocol: protocol.to_string(),
                    local_address: local_ip,
                    local_port,
                    remote_address: remote_ip,
                    remote_port,
                    state: state.to_string(),
                    pid,
                    process_name: process_names.get(&pid).cloned().unwrap_or_default(),
                });
            }
        }
    }

    Ok(connections)
}

fn parse_address(addr: &str) -> (String, u16) {
    if let Some(colon_pos) = addr.rfind(':') {
        let ip = &addr[..colon_pos];
        let port: u16 = addr[colon_pos + 1..].parse().unwrap_or(0);
        (ip.to_string(), port)
    } else {
        (addr.to_string(), 0)
    }
}

fn get_process_name_map() -> HashMap<u32, String> {
    let mut process_names = HashMap::new();
    
    let output = Command::new("tasklist")
        .args(["/FO", "CSV", "/NH"])
        .output()
        .ok();

    if let Some(output) = output {
        let output_str = utils::decode_output(&output.stdout);
        for line in output_str.lines() {
            let line = line.trim();
            if !line.is_empty() {
                let parts: Vec<&str> = line.split(',').collect();
                if parts.len() >= 2 {
                    let name = parts[0].trim_matches('"');
                    if let Some(pid_str) = parts[1].trim_matches('"').parse::<u32>().ok() {
                        process_names.insert(pid_str, name.to_string());
                    }
                }
            }
        }
    }

    process_names
}

pub fn get_port_usage() -> Result<Vec<serde_json::Value>, String> {
    let connections = get_network_connections()?;
    let mut ports: Vec<serde_json::Value> = connections
        .into_iter()
        .map(|conn| {
            serde_json::json!({
                "port": conn.local_port,
                "pid": conn.pid,
                "protocol": conn.protocol,
                "processName": conn.process_name
            })
        })
        .collect();

    ports.sort_by(|a, b| a["port"].as_u64().cmp(&b["port"].as_u64()));
    ports.dedup_by(|a, b| a["port"] == b["port"]);

    Ok(ports)
}

pub fn get_dns_servers() -> Result<Vec<String>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "Get-DnsClientServerAddress -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses"
        ])
        .output()
        .map_err(|e| format!("获取DNS服务器失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    let servers: Vec<String> = output_str
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if servers.is_empty() {
        return Err("未找到DNS服务器配置".to_string());
    }

    Ok(servers)
}

pub fn flush_dns() -> Result<String, String> {
    let output = Command::new("ipconfig")
        .args(["/flushdns"])
        .output()
        .map_err(|e| format!("刷新DNS缓存失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("刷新DNS缓存失败: {}", error));
    }

    Ok(format!("DNS缓存刷新成功！\n{}", result))
}

pub fn release_ip() -> Result<String, String> {
    let output = Command::new("ipconfig")
        .args(["/release"])
        .output()
        .map_err(|e| format!("释放IP地址失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("释放IP地址失败: {}", error));
    }

    Ok(format!("IP地址释放成功！\n{}", result))
}

pub fn renew_ip() -> Result<String, String> {
    let output = Command::new("ipconfig")
        .args(["/renew"])
        .output()
        .map_err(|e| format!("更新IP地址失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("更新IP地址失败: {}", error));
    }

    Ok(format!("IP地址更新成功！\n{}", result))
}

pub fn reset_network() -> Result<String, String> {
    let output = Command::new("netsh")
        .args(["winsock", "reset"])
        .output()
        .map_err(|e| format!("重置网络失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("重置网络失败: {}", error));
    }

    Ok("网络重置成功！\n\n重要提示：您需要重启计算机才能使更改生效。".to_string())
}

pub fn get_network_adapters() -> Result<Vec<NetworkAdapter>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-NetAdapter | Select-Object Name, InterfaceDescription, MacAddress, Status, LinkSpeed | ConvertTo-Json -Compress"
        ])
        .output()
        .map_err(|e| format!("获取网络适配器失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    
    if output_str.trim().is_empty() {
        return Ok(vec![]);
    }
    
    let adapters: Vec<NetworkAdapter> = serde_json::from_str(&output_str)
        .unwrap_or_else(|e| {
            println!("解析网络适配器失败: {}", e);
            vec![]
        });

    Ok(adapters)
}

pub fn disable_adapter(name: &str) -> Result<String, String> {
    let output = Command::new("netsh")
        .args(["interface", "set", "interface", name, "disable"])
        .output()
        .map_err(|e| format!("禁用网络适配器失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("禁用网络适配器 '{}' 失败: {}", name, error));
    }

    Ok(format!("网络适配器 '{}' 已禁用", name))
}

pub fn enable_adapter(name: &str) -> Result<String, String> {
    let output = Command::new("netsh")
        .args(["interface", "set", "interface", name, "enable"])
        .output()
        .map_err(|e| format!("启用网络适配器失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("启用网络适配器 '{}' 失败: {}", name, error));
    }

    Ok(format!("网络适配器 '{}' 已启用", name))
}

pub fn get_ip_config(adapter_name: &str) -> Result<String, String> {
    let output = Command::new("ipconfig")
        .args(["/all"])
        .output()
        .map_err(|e| format!("获取IP配置失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout))
}
