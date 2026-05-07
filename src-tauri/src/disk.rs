use crate::{DiskInfo, utils};
use std::process::Command;
use windows::Win32::{
    Foundation::MAX_PATH,
    Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW,
    },
};

pub fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    let mut disks = Vec::new();

    unsafe {
        let drives = GetLogicalDrives();
        if drives == 0 {
            return Err("获取逻辑驱动器失败".to_string());
        }

        for i in 0..26 {
            if drives & (1 << i) != 0 {
                let drive_letter = (b'A' + i as u8) as char;
                let drive_path = format!("{}:\\", drive_letter);
                let drive_path_wide: Vec<u16> = drive_path.encode_utf16().chain(std::iter::once(0)).collect();
                
                let drive_type = GetDriveTypeW(windows::core::PCWSTR(drive_path_wide.as_ptr()));
                
                let type_name = match drive_type {
                    2 => "Removable",
                    3 => "Fixed",
                    4 => "Network",
                    5 => "CD-ROM",
                    6 => "RAM Disk",
                    _ => "Unknown",
                };
                
                if let Some(disk_info) = get_drive_info(&drive_path, type_name) {
                    disks.push(disk_info);
                }
            }
        }
    }

    Ok(disks)
}

unsafe fn get_drive_info(drive_path: &str, drive_type: &str) -> Option<DiskInfo> {
    let drive_wide: Vec<u16> = drive_path.encode_utf16().chain(std::iter::once(0)).collect();

    let mut free_bytes_available = 0u64;
    let mut total_bytes = 0u64;
    let mut total_free_bytes = 0u64;

    let result = GetDiskFreeSpaceExW(
        windows::core::PCWSTR(drive_wide.as_ptr()),
        Some(&mut free_bytes_available),
        Some(&mut total_bytes),
        Some(&mut total_free_bytes),
    );

    if result.is_err() {
        return None;
    }

    let mut volume_name_buffer = vec![0u16; MAX_PATH as usize];
    let mut file_system_buffer = vec![0u16; MAX_PATH as usize];
    let mut serial_number = 0u32;
    let mut max_component_length = 0u32;
    let mut file_system_flags = 0u32;

    let _ = GetVolumeInformationW(
        windows::core::PCWSTR(drive_wide.as_ptr()),
        Some(&mut volume_name_buffer),
        Some(&mut serial_number),
        Some(&mut max_component_length),
        Some(&mut file_system_flags),
        Some(&mut file_system_buffer),
    );

    let file_system = String::from_utf16_lossy(&file_system_buffer)
        .trim_end_matches('\0')
        .to_string();

    Some(DiskInfo {
        name: drive_path.trim_end_matches('\\').to_string(),
        total_space: total_bytes as u64,
        free_space: free_bytes_available as u64,
        used_space: (total_bytes - free_bytes_available) as u64,
        file_system,
        drive_type: drive_type.to_string(),
    })
}

pub fn cleanup_disk(drive: &str) -> Result<String, String> {
    let drive_letter = drive.trim_end_matches(':').chars().next().unwrap_or('C');
    
    let output = Command::new("cleanmgr")
        .args(["/d", &format!("{}:", drive_letter)])
        .spawn()
        .map_err(|e| format!("启动磁盘清理失败: {}", e))?;

    drop(output);
    
    Ok("磁盘清理工具已启动！请在弹出的窗口中选择要清理的文件。".to_string())
}

pub fn check_disk(drive: &str) -> Result<String, String> {
    let drive_letter = drive.trim_end_matches(':').trim_end_matches('\\').chars().next().unwrap_or('C');
    
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; chkdsk {}: /f /r",
        drive_letter
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("检查磁盘失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);
    let error = utils::decode_output(&output.stderr);

    if !output.status.success() && !error.is_empty() {
        return Err(format!("检查磁盘失败: {}", error));
    }

    Ok(format!("磁盘检查已启动！\n{}", result))
}

pub fn defragment_disk(drive: &str) -> Result<String, String> {
    let drive_letter = drive.trim_end_matches(':').trim_end_matches('\\').chars().next().unwrap_or('C');
    
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Optimize-Volume -DriveLetter {} -Defrag",
        drive_letter
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("磁盘碎片整理失败: {}", e))?;

    let result = utils::decode_output(&output.stdout);

    if result.is_empty() {
        return Ok(format!("磁盘 {}: 不需要碎片整理。", drive_letter));
    }

    Ok(format!("磁盘碎片整理完成！\n{}", result))
}

pub fn get_disk_usage(path: &str) -> Result<String, String> {
    let command = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ChildItem -Path '{}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum | Format-List Count, Sum",
        path
    );

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &command
        ])
        .output()
        .map_err(|e| format!("获取磁盘使用情况失败: {}", e))?;

    Ok(utils::decode_output(&output.stdout))
}

pub fn format_disk(_drive: &str, _fs_type: &str, _label: &str) -> Result<String, String> {
    Err("格式化操作已禁用。请使用命令提示符（管理员）手动执行此操作。".to_string())
}
