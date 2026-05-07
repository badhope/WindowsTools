use crate::{CommandResult, SystemInfo, utils};
use std::process::Command;
use std::env;

pub fn get_system_info() -> Result<SystemInfo, String> {
    let os_name = "Windows".to_string();
    let os_version = get_os_version().unwrap_or_else(|_| "Unknown".to_string());
    let computer_name = get_computer_name();
    let user_name = get_user_name();
    let cpu = get_cpu_info().unwrap_or_else(|_| "Unknown".to_string());
    let ram = get_total_memory().unwrap_or(0);
    let architecture = env::consts::ARCH.to_string();
    let os_build = get_os_build().unwrap_or_else(|_| "".to_string());

    Ok(SystemInfo {
        os_name,
        os_version,
        os_build,
        computer_name,
        user_name,
        cpu,
        ram,
        architecture,
    })
}

pub fn restart_as_admin() -> Result<(), String> {
    let exe_path = env::current_exe()
        .map_err(|e| format!("获取程序路径失败: {}", e))?;
    
    let exe_path_str = exe_path.to_string_lossy().to_string();
    
    let command = format!(
        "Start-Process -FilePath '{}' -Verb RunAs",
        exe_path_str
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .spawn()
        .map_err(|e| format!("启动管理员进程失败: {}", e))?;

    drop(output);
    
    Ok(())
}

pub fn is_admin() -> Result<bool, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
        ])
        .output()
        .map_err(|e| format!("检查管理员权限失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);
    Ok(result.trim().eq_ignore_ascii_case("True"))
}

fn get_computer_name() -> String {
    env::var("COMPUTERNAME").unwrap_or_else(|_| "Unknown".to_string())
}

fn get_user_name() -> String {
    env::var("USERNAME").unwrap_or_else(|_| "Unknown".to_string())
}

fn get_os_version() -> Result<String, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "(Get-WmiObject -Class Win32_OperatingSystem).Caption"
        ])
        .output()
        .map_err(|e| format!("获取操作系统版本失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout).trim().to_string())
}

fn get_os_build() -> Result<String, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "(Get-WmiObject -Class Win32_OperatingSystem).BuildNumber"
        ])
        .output()
        .map_err(|e| format!("获取操作系统版本失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout).trim().to_string())
}

fn get_cpu_info() -> Result<String, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "(Get-WmiObject -Class Win32_Processor).Name"
        ])
        .output()
        .map_err(|e| format!("获取CPU信息失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout).trim().to_string())
}

fn get_total_memory() -> Result<u64, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "(Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory"
        ])
        .output()
        .map_err(|e| format!("获取内存信息失败: {}", e))?;

    let decoded = utils::decode_output(&output.stdout);
    let result = decoded.trim();
    result.parse::<u64>().map_err(|e| format!("解析内存大小失败: {}", e))
}

pub fn execute_powershell(command: &str) -> Result<CommandResult, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            command
        ])
        .output()
        .map_err(|e| format!("执行PowerShell命令失败: {}", e))?;

    let exit_code = output.status.code().unwrap_or(-1);

    Ok(CommandResult {
        output: utils::decode_output(&output.stdout),
        error: utils::decode_output(&output.stderr),
        success: output.status.success(),
        exit_code,
    })
}

pub fn open_system_tool(command: &str) -> Result<(), String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &format!("Start-Process '{}'", command)
        ])
        .spawn()
        .map_err(|e| format!("打开系统工具失败: {}", e))?;

    drop(output);
    Ok(())
}

pub fn get_startup_items() -> Result<Vec<serde_json::Value>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' | ForEach-Object { foreach($prop in $_.PSObject.Properties) { if($prop.Name -ne 'PSPath' -and $prop.Name -ne 'PSParentPath' -and $prop.Name -ne 'PSChildName' -and $prop.Name -ne 'PSDrive' -and $prop.Name -ne 'PSProvider') { @{name=$prop.Name;command=$prop.Value;location='HKCU:\\Run';enabled=$true} | ConvertTo-Json -Compress } } }"
        ])
        .output()
        .map_err(|e| format!("获取启动项失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    
    let items: Vec<serde_json::Value> = output_str
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();

    Ok(items)
}

pub fn toggle_startup_item(name: &str, enabled: bool) -> Result<(), String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &format!(
                "if({}) {{ Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '{}' -Value '' }} else {{ Remove-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '{}' -ErrorAction SilentlyContinue }}",
                enabled, name, name
            )
        ])
        .output()
        .map_err(|e| format!("修改启动项失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("修改启动项失败: {}", error));
    }

    Ok(())
}

pub fn get_scheduled_tasks() -> Result<Vec<serde_json::Value>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ScheduledTask | Select-Object TaskName,State,LastRunTime,NextRunTime | ConvertTo-Json -Compress"
        ])
        .output()
        .map_err(|e| format!("获取计划任务失败: {}", e))?;

    let output_str = utils::decode_output(&output.stdout);
    
    if output_str.trim().is_empty() {
        return Ok(vec![]);
    }
    
    let tasks: Vec<serde_json::Value> = serde_json::from_str(&output_str)
        .unwrap_or_else(|e| {
            println!("解析计划任务失败: {}", e);
            vec![]
        });

    Ok(tasks)
}

pub fn run_scheduled_task(name: &str) -> Result<(), String> {
    execute_powershell(&format!("Start-ScheduledTask -TaskName '{}'", name))?;
    Ok(())
}

pub fn disable_scheduled_task(name: &str) -> Result<(), String> {
    execute_powershell(&format!("Disable-ScheduledTask -TaskName '{}'", name))?;
    Ok(())
}

pub fn clean_temp_files() -> Result<serde_json::Value, String> {
    let output = execute_powershell(
        "$temp = $env:TEMP; $count = (Get-ChildItem $temp -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object).Count; $size = (Get-ChildItem $temp -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Remove-Item \"$temp\\*\" -Recurse -Force -ErrorAction SilentlyContinue; @{deleted=$count; freed=$size} | ConvertTo-Json"
    )?;

    let result: serde_json::Value = serde_json::from_str(&output.output)
        .unwrap_or(serde_json::json!({"deleted": 0, "freed": 0}));

    Ok(result)
}

pub fn clean_cache_files() -> Result<serde_json::Value, String> {
    let output = execute_powershell(
        "$cache = \"$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\"; $count = (Get-ChildItem $cache -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object).Count; $size = (Get-ChildItem $cache -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Remove-Item \"$cache\\*\" -Recurse -Force -ErrorAction SilentlyContinue; @{deleted=$count; freed=$size} | ConvertTo-Json"
    )?;

    let result: serde_json::Value = serde_json::from_str(&output.output)
        .unwrap_or(serde_json::json!({"deleted": 0, "freed": 0}));

    Ok(result)
}

pub fn optimize_performance() -> Result<(), String> {
    execute_powershell(
        "Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Remove-Item \"$env:TEMP\\*\" -Recurse -Force -ErrorAction SilentlyContinue"
    )?;
    Ok(())
}

pub fn get_env_variables() -> Result<Vec<serde_json::Value>, String> {
    let mut vars = Vec::new();
    
    for (key, value) in env::vars() {
        vars.push(serde_json::json!({
            "name": key,
            "value": value,
            "scope": "user"
        }));
    }

    Ok(vars)
}

pub fn set_env_variable(name: &str, value: &str, scope: &str) -> Result<(), String> {
    let command = if scope == "system" {
        format!("[Environment]::SetEnvironmentVariable('{}', '{}', 'Machine')", name, value)
    } else {
        format!("[Environment]::SetEnvironmentVariable('{}', '{}', 'User')", name, value)
    };

    execute_powershell(&command)?;
    Ok(())
}

pub fn delete_env_variable(name: &str, scope: &str) -> Result<(), String> {
    let command = if scope == "system" {
        format!("[Environment]::SetEnvironmentVariable('{}', $null, 'Machine')", name)
    } else {
        format!("[Environment]::SetEnvironmentVariable('{}', $null, 'User')", name)
    };

    execute_powershell(&command)?;
    Ok(())
}

pub fn get_hosts_entries() -> Result<Vec<serde_json::Value>, String> {
    let hosts_path = "C:\\Windows\\System32\\drivers\\etc\\hosts";
    let content = std::fs::read_to_string(hosts_path)
        .map_err(|e| format!("Failed to read hosts file: {}", e))?;

    let mut entries = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            entries.push(serde_json::json!({
                "ip": parts[0],
                "hostname": parts[1]
            }));
        }
    }

    Ok(entries)
}

pub fn add_hosts_entry(ip: &str, hostname: &str) -> Result<(), String> {
    let hosts_path = "C:\\Windows\\System32\\drivers\\etc\\hosts";
    let entry = format!("\n{} {}", ip, hostname);
    
    std::fs::OpenOptions::new()
        .append(true)
        .open(hosts_path)
        .and_then(|mut file| std::io::Write::write_all(&mut file, entry.as_bytes()))
        .map_err(|e| format!("Failed to write hosts file: {}", e))?;

    Ok(())
}

pub fn delete_hosts_entry(ip: &str, hostname: &str) -> Result<(), String> {
    let hosts_path = "C:\\Windows\\System32\\drivers\\etc\\hosts";
    let content = std::fs::read_to_string(hosts_path)
        .map_err(|e| format!("Failed to read hosts file: {}", e))?;

    let new_content: String = content
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return true;
            }
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            !(parts.len() >= 2 && parts[0] == ip && parts[1] == hostname)
        })
        .collect::<Vec<&str>>()
        .join("\n");

    std::fs::write(hosts_path, new_content)
        .map_err(|e| format!("Failed to write hosts file: {}", e))?;

    Ok(())
}

pub fn run_sfc_scan() -> Result<(), String> {
    execute_powershell("Start-Process sfc -ArgumentList '/scannow' -Verb RunAs -Wait")?;
    Ok(())
}

pub fn run_dism() -> Result<(), String> {
    execute_powershell("Start-Process dism -ArgumentList '/online /cleanup-image /restorehealth' -Verb RunAs -Wait")?;
    Ok(())
}

pub fn check_windows_update() -> Result<(), String> {
    open_system_tool("ms-settings:windowsupdate")?;
    Ok(())
}
