use crate::{ProcessInfo, utils};
use sysinfo::System;
use std::process::Command;

pub fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut processes = Vec::new();

    for (pid, process) in sys.processes() {
        let pid_u32 = pid.as_u32();
        let cpu = process.cpu_usage();
        let memory = process.memory() * 1024;
        let name = process.name().to_string_lossy().to_string();
        let path = process.exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
        let user = process.user_id().map(|u| u.to_string()).unwrap_or_else(|| "Unknown".to_string());
        let priority = "Normal".to_string();
        let threads = 0u32;
        let handles = 0u32;
        let start_time = process.start_time();
        let start_time_str = utils::format_timestamp(start_time);
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let run_time_secs = now.saturating_sub(start_time);
        let run_time_str = utils::format_duration(run_time_secs);
        
        let command_line = process.cmd().iter()
            .map(|s| s.to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join(" ");

        processes.push(ProcessInfo {
            pid: pid_u32,
            name,
            cpu,
            memory,
            path,
            user,
            priority,
            threads,
            handles,
            start_time: start_time_str,
            run_time: run_time_str,
            command_line,
        });
    }

    processes.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));

    Ok(processes)
}

pub fn end_process(pid: u32) -> Result<(), String> {
    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .output()
        .map_err(|e| format!("结束进程失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("结束进程失败: {}", error));
    }

    Ok(())
}

pub fn end_process_by_name(name: &str) -> Result<(), String> {
    let output = Command::new("taskkill")
        .args(["/F", "/IM", name])
        .output()
        .map_err(|e| format!("结束进程失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("结束进程失败: {}", error));
    }

    Ok(())
}

pub fn set_process_priority(pid: u32, priority: &str) -> Result<(), String> {
    let priority_class = match priority {
        "Idle" | "Idle" => "Idle",
        "BelowNormal" | "Low" => "BelowNormal",
        "Normal" => "Normal",
        "AboveNormal" => "AboveNormal",
        "High" => "High",
        "Realtime" => "Realtime",
        _ => "Normal",
    };

    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
        try {{ \
            $p = Get-Process -Id {} -ErrorAction Stop; \
            $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::{}; \
            Write-Output 'SUCCESS' \
        }} catch {{ \
            Write-Error $_.Exception.Message; \
            exit 1 \
        }}",
        pid, priority_class
    );
    
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("设置进程优先级失败: {}", e))?;

    if !output.status.success() {
        let error = utils::decode_output(&output.stderr);
        return Err(format!("设置进程优先级失败: {}", error));
    }

    Ok(())
}

pub fn open_file_location(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("文件路径为空".to_string());
    }
    
    let output = Command::new("explorer")
        .args(["/select,", path])
        .spawn()
        .map_err(|e| format!("打开文件位置失败: {}", e))?;

    drop(output);
    Ok(())
}

pub fn get_process_detail(pid: u32) -> Result<String, String> {
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
        Get-Process -Id {} | Format-List Id, ProcessName, CPU, WorkingSet64, StartTime, Path, Company, ProductVersion",
        pid
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("获取进程详情失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout))
}

pub fn get_process_handles(pid: u32) -> Result<Vec<String>, String> {
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
        (Get-Process -Id {}).HandleCount",
        pid
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("获取进程句柄失败: {}", e))?;

    let handle_count = utils::decode_output(&output.stdout).trim().to_string();
    
    Ok(vec![handle_count])
}
