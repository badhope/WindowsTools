use crate::{ServiceInfo, utils};
use std::process::Command;

pub fn get_services() -> Result<Vec<ServiceInfo>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json -Compress"
        ])
        .output()
        .map_err(|e| format!("获取服务列表失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    
    if output_str.trim().is_empty() {
        return Ok(vec![]);
    }
    
    let services: Vec<ServiceInfo> = serde_json::from_str(&output_str)
        .unwrap_or_else(|e| {
            println!("解析服务失败: {}", e);
            vec![]
        });

    Ok(services)
}

pub fn control_service(name: &str, action: &str) -> Result<(), String> {
    let (command, action_desc) = match action {
        "start" => (format!("Start-Service -Name '{}' -ErrorAction Stop", name), "启动"),
        "stop" => (format!("Stop-Service -Name '{}' -Force -ErrorAction Stop", name), "停止"),
        "restart" => (format!("Restart-Service -Name '{}' -Force -ErrorAction Stop", name), "重启"),
        "pause" => (format!("Suspend-Service -Name '{}' -ErrorAction Stop", name), "暂停"),
        "resume" => (format!("Resume-Service -Name '{}' -ErrorAction Stop", name), "恢复"),
        _ => return Err(format!("未知的操作: {}", action)),
    };

    let full_command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; try {{ {} | Out-Null; Write-Output 'SUCCESS' }} catch {{ Write-Error $_.Exception.Message; exit 1 }}",
        command
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &full_command
        ])
        .output()
        .map_err(|e| format!("{}服务失败: {}", action_desc, e))?;

    let stderr = utils::decode_output(&output.stderr);
    let stdout = utils::decode_output(&output.stdout);

    if !output.status.success() {
        return Err(format!("{}服务失败: {}", action_desc, stderr));
    }

    Ok(())
}

pub fn set_service_start_type(name: &str, start_type: &str) -> Result<(), String> {
    let (command, type_desc) = match start_type {
        "Automatic" => (format!("Set-Service -Name '{}' -StartupType Automatic", name), "自动"),
        "Manual" => (format!("Set-Service -Name '{}' -StartupType Manual", name), "手动"),
        "Disabled" => (format!("Set-Service -Name '{}' -StartupType Disabled", name), "禁用"),
        _ => return Err(format!("未知的启动类型: {}", start_type)),
    };

    let full_command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; try {{ {} | Out-Null; Write-Output 'SUCCESS' }} catch {{ Write-Error $_.Exception.Message; exit 1 }}",
        command
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &full_command
        ])
        .output()
        .map_err(|e| format!("设置服务启动类型失败: {}", e))?;

    let stderr = utils::decode_output(&output.stderr);

    if !output.status.success() {
        return Err(format!("设置{}启动类型失败: {}", type_desc, stderr));
    }

    Ok(())
}

pub fn get_service_detail(name: &str) -> Result<String, String> {
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Service -Name '{}' | Format-List *",
        name
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("获取服务详情失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout))
}

pub fn get_service_dependencies(name: &str) -> Result<Vec<String>, String> {
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-Service -Name '{}').ServicesDependedOn | Select-Object -ExpandProperty Name",
        name
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("获取服务依赖失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    
    let dependencies: Vec<String> = output_str
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    Ok(dependencies)
}
