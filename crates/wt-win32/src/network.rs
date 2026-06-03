//! Network: TCP / UDP tables (using iphlpapi).

use serde::{Deserialize, Serialize};
use std::mem;
use wt_core::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpRow {
    pub local: String,
    pub local_port: u16,
    pub remote: String,
    pub remote_port: u16,
    pub state: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UdpRow {
    pub local: String,
    pub local_port: u16,
    pub pid: u32,
}

const AF_INET: u32 = 2;
const TCP_TABLE_OWNER_PID_ALL: u32 = 5;
const UDP_TABLE_OWNER_PID: u32 = 1;

#[repr(C)]
#[derive(Default, Clone, Copy)]
struct MibTcpRowOwnerPid {
    pub state: u32,
    pub local_addr: u32,
    pub local_port: u32,
    pub remote_addr: u32,
    pub remote_port: u32,
    pub owning_pid: u32,
}

#[repr(C)]
#[derive(Default, Clone, Copy)]
struct MibUdpRowOwnerPid {
    pub local_addr: u32,
    pub local_port: u32,
    pub owning_pid: u32,
}

#[link(name = "iphlpapi")]
extern "system" {
    fn GetExtendedTcpTable(
        tcp_table: *mut u8,
        size: *mut u32,
        order: i32,
        family: u32,
        table_class: u32,
        reserved: u32,
    ) -> u32;
    fn GetExtendedUdpTable(
        udp_table: *mut u8,
        size: *mut u32,
        order: i32,
        family: u32,
        table_class: u32,
        reserved: u32,
    ) -> u32;
}

pub fn tcp_connections() -> Result<Vec<TcpRow>> {
    unsafe {
        let mut out = Vec::new();
        let mut size: u32 = 0;
        let r = GetExtendedTcpTable(std::ptr::null_mut(), &mut size, 0, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0);
        if r != 0 && r != 122 { return Ok(out); } // 122 = ERROR_INSUFFICIENT_BUFFER
        if size == 0 { return Ok(out); }
        let mut buf = vec![0u8; size as usize];
        let r = GetExtendedTcpTable(buf.as_mut_ptr(), &mut size, 0, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0);
        if r != 0 { return Ok(out); }
        let count = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]);
        let entry_size = mem::size_of::<MibTcpRowOwnerPid>();
        if buf.len() < 4 + (count as usize) * entry_size { return Ok(out); }
        let entries = std::slice::from_raw_parts(buf.as_ptr().add(4) as *const MibTcpRowOwnerPid, count as usize);
        for e in entries {
            out.push(TcpRow {
                local: format_v4(e.local_addr),
                local_port: ((e.local_port & 0xFF) << 8 | (e.local_port >> 8)) as u16,
                remote: format_v4(e.remote_addr),
                remote_port: ((e.remote_port & 0xFF) << 8 | (e.remote_port >> 8)) as u16,
                state: tcp_state_name(e.state),
                pid: e.owning_pid,
            });
        }
        Ok(out)
    }
}

pub fn udp_endpoints() -> Result<Vec<UdpRow>> {
    unsafe {
        let mut out = Vec::new();
        let mut size: u32 = 0;
        let r = GetExtendedUdpTable(std::ptr::null_mut(), &mut size, 0, AF_INET, UDP_TABLE_OWNER_PID, 0);
        if r != 0 && r != 122 { return Ok(out); }
        if size == 0 { return Ok(out); }
        let mut buf = vec![0u8; size as usize];
        let r = GetExtendedUdpTable(buf.as_mut_ptr(), &mut size, 0, AF_INET, UDP_TABLE_OWNER_PID, 0);
        if r != 0 { return Ok(out); }
        let count = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]);
        let entry_size = mem::size_of::<MibUdpRowOwnerPid>();
        if buf.len() < 4 + (count as usize) * entry_size { return Ok(out); }
        let entries = std::slice::from_raw_parts(buf.as_ptr().add(4) as *const MibUdpRowOwnerPid, count as usize);
        for e in entries {
            out.push(UdpRow {
                local: format_v4(e.local_addr),
                local_port: ((e.local_port & 0xFF) << 8 | (e.local_port >> 8)) as u16,
                pid: e.owning_pid,
            });
        }
        Ok(out)
    }
}

fn format_v4(addr: u32) -> String {
    let b = addr.to_le_bytes();
    format!("{}.{}.{}.{}", b[0], b[1], b[2], b[3])
}

fn tcp_state_name(state: u32) -> String {
    match state {
        1 => "CLOSED",
        2 => "LISTENING",
        3 => "SYN_SENT",
        4 => "SYN_RCVD",
        5 => "ESTABLISHED",
        6 => "FIN_WAIT1",
        7 => "FIN_WAIT2",
        8 => "CLOSE_WAIT",
        9 => "CLOSING",
        10 => "LAST_ACK",
        11 => "TIME_WAIT",
        12 => "DELETE_TCB",
        _ => "UNKNOWN",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lists_tcp() { assert!(tcp_connections().is_ok()); }
    #[test]
    fn lists_udp() { assert!(udp_endpoints().is_ok()); }
}
