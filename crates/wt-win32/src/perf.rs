//! Performance sampling using PDH (Performance Data Helper).
//!
//! Provides CPU%, memory%, and disk I/O samples on demand. A background
//! sampler can publish `PerfSample` events at a fixed interval.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::Mutex;
use std::ffi::c_void;
use wt_core::{Error, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerfSample {
    pub timestamp_ms: u64,
    pub cpu_percent: f64,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
    pub disk_read_bytes_per_sec: u64,
    pub disk_write_bytes_per_sec: u64,
}

pub struct PerfSampler {
    inner: Arc<Mutex<Option<PerfInner>>>,
}

struct PerfInner {
    query: PdhQuery,
    cpu_total: PdhCounter,
    mem_avail: PdhCounter,
    disk_read: PdhCounter,
    disk_write: PdhCounter,
    prev_read: f64,
    prev_write: f64,
    prev_tick: u64,
}

// PDH types (raw pointers, since the windows crate bindings are inconsistent).
type PdhQuery = *mut c_void;
type PdhCounter = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy)]
struct PdhFmtCountervalue {
    status: u32,
    _pad: u32,
    pub value: PdhFmtValue,
}

impl Default for PdhFmtCountervalue {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
union PdhFmtValue {
    pub long_value: i32,
    pub double_value: f64,
    pub large_value: i64,
    pub ansi_string: *mut u8,
    pub wide_string: *mut u16,
}

#[link(name = "pdh")]
extern "system" {
    fn PdhOpenQueryW(data_source: *const u16, user_data: usize, query: *mut PdhQuery) -> u32;
    fn PdhAddCounterW(query: PdhQuery, counter_path: *const u16, user_data: usize, counter: *mut PdhCounter) -> u32;
    fn PdhCollectQueryData(query: PdhQuery) -> u32;
    fn PdhGetFormattedCounterValue(counter: PdhCounter, format: u32, ret: *mut u32, value: *mut PdhFmtCountervalue) -> u32;
    fn PdhCloseQuery(query: PdhQuery) -> u32;
    fn PdhRemoveCounter(counter: PdhCounter) -> u32;
}

const PDH_FMT_DOUBLE: u32 = 0x00000200;
const PDH_INVALID_HANDLE: u32 = 0xC0000BBC;
const PDH_MORE_DATA: u32 = 0x800007D2;

unsafe impl Send for PerfSampler {}
unsafe impl Sync for PerfSampler {}

impl PerfSampler {
    pub fn new() -> Result<Self> {
        let s = Self { inner: Arc::new(Mutex::new(None)) };
        s.open()?;
        Ok(s)
    }

    fn open(&self) -> Result<()> {
        unsafe {
            let mut q: PdhQuery = std::ptr::null_mut();
            let r = PdhOpenQueryW(std::ptr::null(), 0, &mut q);
            if r != 0 { return Err(Error::win32(r as i32, "PdhOpenQueryW")); }
            let cpu = self.add_counter(q, r"\Processor(_Total)\% Processor Time")?;
            let mem = self.add_counter(q, r"\Memory\Available Bytes")?;
            let dr = self.add_counter(q, r"\PhysicalDisk(_Total)\Disk Read Bytes/sec")?;
            let dw = self.add_counter(q, r"\PhysicalDisk(_Total)\Disk Write Bytes/sec")?;
            let r = PdhCollectQueryData(q);
            if r != 0 { return Err(Error::win32(r as i32, "PdhCollectQueryData prime")); }
            *self.inner.lock() = Some(PerfInner {
                query: q, cpu_total: cpu, mem_avail: mem, disk_read: dr, disk_write: dw,
                prev_read: 0.0, prev_write: 0.0, prev_tick: now_ms(),
            });
            Ok(())
        }
    }

    unsafe fn add_counter(&self, q: PdhQuery, path: &str) -> Result<PdhCounter> {
        let mut path_w: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
        let mut counter: PdhCounter = std::ptr::null_mut();
        let r = PdhAddCounterW(q, path_w.as_ptr(), 0, &mut counter);
        if r != 0 { return Err(Error::win32(r as i32, format!("PdhAddCounterW {path}"))); }
        Ok(counter)
    }

    pub fn sample(&self) -> Result<PerfSample> {
        let mut g = self.inner.lock();
        let inner = g.as_mut().ok_or_else(|| Error::Other("sampler not open".into()))?;
        unsafe {
            let r = PdhCollectQueryData(inner.query);
            if r != 0 { return Err(Error::win32(r as i32, "PdhCollectQueryData")); }
            let cpu = read_counter(inner.cpu_total)?;
            let _ = read_counter(inner.mem_avail);
            let dr = read_counter(inner.disk_read).unwrap_or(0.0);
            let dw = read_counter(inner.disk_write).unwrap_or(0.0);
            let (used, total) = read_global_memory();
            let now = now_ms();
            let dt_ms = now.saturating_sub(inner.prev_tick).max(1) as f64;
            let rps = ((dr - inner.prev_read) * 1000.0 / dt_ms).max(0.0) as u64;
            let wps = ((dw - inner.prev_write) * 1000.0 / dt_ms).max(0.0) as u64;
            inner.prev_read = dr;
            inner.prev_write = dw;
            inner.prev_tick = now;
            Ok(PerfSample {
                timestamp_ms: now,
                cpu_percent: cpu,
                mem_used_bytes: used,
                mem_total_bytes: total,
                disk_read_bytes_per_sec: rps,
                disk_write_bytes_per_sec: wps,
            })
        }
    }
}

unsafe fn read_counter(h: PdhCounter) -> Result<f64> {
    let mut val: PdhFmtCountervalue = std::mem::zeroed();
    let r = PdhGetFormattedCounterValue(h, PDH_FMT_DOUBLE, std::ptr::null_mut(), &mut val);
    if r != 0 { return Err(Error::win32(r as i32, "PdhGetFormattedCounterValue")); }
    Ok(val.value.double_value)
}

impl Drop for PerfInner {
    fn drop(&mut self) {
        unsafe {
            let _ = PdhRemoveCounter(self.cpu_total);
            let _ = PdhRemoveCounter(self.mem_avail);
            let _ = PdhRemoveCounter(self.disk_read);
            let _ = PdhRemoveCounter(self.disk_write);
            let _ = PdhCloseQuery(self.query);
        }
    }
}

fn now_ms() -> u64 {
    #[link(name = "kernel32")]
    extern "system" { fn GetTickCount64() -> u64; }
    unsafe { GetTickCount64() }
}

fn read_global_memory() -> (u64, u64) {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    unsafe {
        let mut s: MEMORYSTATUSEX = std::mem::zeroed();
        s.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        let _ = GlobalMemoryStatusEx(&mut s);
        (s.ullTotalPhys - s.ullAvailPhys, s.ullTotalPhys)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn opens_and_samples() {
        let s = PerfSampler::new().expect("PDH open");
        let v = s.sample().expect("sample");
        assert!(v.cpu_percent >= 0.0);
    }
}
