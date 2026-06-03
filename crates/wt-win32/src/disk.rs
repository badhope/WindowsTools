//! Disk / volume enumeration: free space, total space, type, label.

use serde::{Deserialize, Serialize};
use std::ffi::c_void;
use wt_core::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Volume {
    pub mount_point: String,
    pub label: String,
    pub fs: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub kind: String,
}

const DRIVE_LETTERS: &[char] = &['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const FILE_SHARE_READ: u32 = 0x00000001;
const FILE_SHARE_WRITE: u32 = 0x00000002;
const OPEN_EXISTING: u32 = 3;
const INVALID_HANDLE_VALUE: *mut c_void = -1 as isize as *mut c_void;

#[link(name = "kernel32")]
extern "system" {
    fn GetDriveTypeW(root: *const u16) -> u32;
    fn GetDiskFreeSpaceExW(
        root: *const u16,
        free_avail: *mut u64,
        total: *mut u64,
        free_total: *mut u64,
    ) -> i32;
    fn CreateFileW(
        name: *const u16,
        access: u32,
        share: u32,
        sec: *mut c_void,
        creation: u32,
        flags: u32,
        template: *mut c_void,
    ) -> *mut c_void;
    fn GetVolumeInformationByHandleW(
        handle: *mut c_void,
        name_buf: *mut u16,
        name_size: u32,
        serial: *mut u32,
        max_comp: *mut u32,
        flags: *mut u32,
        fs_buf: *mut u16,
        fs_size: u32,
    ) -> i32;
    fn CloseHandle(h: *mut c_void) -> i32;
}

fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn list() -> Result<Vec<Volume>> {
    let mut out = Vec::new();
    for &c in DRIVE_LETTERS {
        let mount = format!("{}:\\", c);
        let mount_w = wide_null(&mount);
        let kind_code = unsafe { GetDriveTypeW(mount_w.as_ptr()) };
        let kind = match kind_code {
            0 => "Unknown",
            1 => "NoRootDir",
            2 => "Removable",
            3 => "Fixed",
            4 => "Network",
            5 => "CDRom",
            6 => "Ramdisk",
            _ => "Unknown",
        };
        if kind_code == 1 || kind_code == 0 { continue; }
        let mut free: u64 = 0;
        let mut total: u64 = 0;
        let mut avail: u64 = 0;
        let ok = unsafe { GetDiskFreeSpaceExW(mount_w.as_ptr(), &mut avail, &mut total, &mut free) };
        if ok == 0 { continue; }
        let (label, fs) = read_label_fs(&mount_w);
        out.push(Volume {
            mount_point: mount, label, fs, total_bytes: total, free_bytes: free, kind: kind.to_string(),
        });
    }
    Ok(out)
}

fn read_label_fs(mount_w: &[u16]) -> (String, String) {
    unsafe {
        let h = CreateFileW(
            mount_w.as_ptr(), 0, FILE_SHARE_READ | FILE_SHARE_WRITE,
            std::ptr::null_mut(), OPEN_EXISTING, 0, std::ptr::null_mut(),
        );
        if h.is_null() || h == INVALID_HANDLE_VALUE { return (String::new(), String::new()); }
        let mut name = vec![0u16; 261];
        let mut fs = vec![0u16; 261];
        let mut serial: u32 = 0;
        let mut max_comp: u32 = 0;
        let mut flags: u32 = 0;
        let ok = GetVolumeInformationByHandleW(
            h, name.as_mut_ptr(), name.len() as u32,
            &mut serial, &mut max_comp, &mut flags,
            fs.as_mut_ptr(), fs.len() as u32,
        );
        CloseHandle(h);
        if ok == 0 { (String::new(), String::new()) } else { (wide_to_string(&name), wide_to_string(&fs)) }
    }
}

fn wide_to_string(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn enumerates_volumes() {
        let v = list().unwrap();
        assert!(!v.is_empty(), "should have at least one drive");
    }
}
