//! Registry: open / read / write / enumerate.
//!
//! Backed entirely by `RegOpenKeyExW` / `RegQueryValueExW` / `RegSetValueExW` /
//! `RegEnumKeyExW` / `RegEnumValueW` / `RegDeleteTreeW`. No PowerShell.

use serde::{Deserialize, Serialize};
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteTreeW, RegEnumKeyExW, RegEnumValueW, RegOpenKeyExW,
    RegQueryValueExW, RegSetValueExW, HKEY, KEY_CREATE_SUB_KEY, KEY_ENUMERATE_SUB_KEYS,
    KEY_QUERY_VALUE, KEY_READ, KEY_SET_VALUE, KEY_WRITE, REG_BINARY, REG_DWORD, REG_EXPAND_SZ,
    REG_MULTI_SZ, REG_NONE, REG_QWORD, REG_SAM_FLAGS, REG_SZ, REG_VALUE_TYPE,
};
use wt_core::{Error, Result};
use crate::util::{check, wide_to_string};

pub use wt_core::registry_path::{Hive, RegistryPath};

/// Borrowed open registry key. Closes on drop.
pub struct Key(pub HKEY);

impl Drop for Key {
    fn drop(&mut self) {
        if !self.0 .0.is_null() {
            let _ = unsafe { RegCloseKey(self.0) };
        }
    }
}

/// Open a key. `writable` controls the access mask.
pub fn open_key(hive: Hive, sub: &str, writable: bool) -> Result<Key> {
    let rights: REG_SAM_FLAGS = if writable {
        KEY_READ | KEY_WRITE | KEY_SET_VALUE | KEY_CREATE_SUB_KEY
    } else {
        KEY_READ
    };
    let sub_w = crate::util::wide_null(sub);
    let mut out = HKEY(std::ptr::null_mut());
    let r = unsafe {
        RegOpenKeyExW(
            HKEY(hive.hkey() as *mut _),
            windows::core::PCWSTR(sub_w.as_ptr()),
            0,
            rights,
            &mut out,
        )
    };
    check(r, format!("RegOpenKeyExW {hive}\\{sub}"))?;
    Ok(Key(out))
}

/// Open a key from a canonical path.
pub fn open_path(path: &RegistryPath, writable: bool) -> Result<Key> {
    open_key(path.hive(), path.sub(), writable)
}

/// All value names and their data in a key.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueInfo {
    pub name: String,
    pub kind: String,
    pub data: ValueData,
}

/// A `ValueData` is the post-decoded form of a registry value.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum ValueData {
    Sz(String),
    ExpandSz(String),
    Dword(u32),
    Qword(u64),
    MultiSz(Vec<String>),
    Binary(Vec<u8>),
    None,
}

impl ValueData {
    /// Best-effort string representation for the UI.
    pub fn display(&self) -> String {
        match self {
            ValueData::Sz(s) | ValueData::ExpandSz(s) => s.clone(),
            ValueData::Dword(v) => format!("{v} (0x{v:08x})"),
            ValueData::Qword(v) => format!("{v} (0x{v:016x})"),
            ValueData::MultiSz(v) => v.join(" \u{2022} "),
            ValueData::Binary(v) => v.iter().map(|b| format!("{b:02x}")).collect::<Vec<_>>().join(" "),
            ValueData::None => String::new(),
        }
    }
}

/// Read a value and decode it to its `ValueData` form, based on the
/// stored registry type.
pub fn read_any(key: &Key, name: &str) -> Result<ValueData> {
    let name_w = crate::util::wide_null(name);
    let mut kind: REG_VALUE_TYPE = REG_NONE;
    let mut size: u32 = 0;
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            None,
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW size {name}"))?;
    if size == 0 { return Ok(ValueData::None); }
    let mut buf = vec![0u8; size as usize];
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            Some(buf.as_mut_ptr()),
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW data {name}"))?;
    Ok(decode_value_any(kind, &buf[..size as usize]))
}

fn decode_value_any(kind: REG_VALUE_TYPE, data: &[u8]) -> ValueData {
    match kind.0 {
        1 => ValueData::Sz(decode_wide(data)),         // REG_SZ
        2 => ValueData::ExpandSz(decode_wide(data)),   // REG_EXPAND_SZ
        4 => {                                         // REG_DWORD
            if data.len() < 4 { return ValueData::None; }
            ValueData::Dword(u32::from_le_bytes([data[0], data[1], data[2], data[3]]))
        }
        11 => {                                        // REG_QWORD
            if data.len() < 8 { return ValueData::None; }
            let mut b = [0u8; 8];
            b.copy_from_slice(&data[..8]);
            ValueData::Qword(u64::from_le_bytes(b))
        }
        7 => {                                         // REG_MULTI_SZ
            let s = decode_wide(data);
            let parts: Vec<String> = s.split('\0').filter(|p| !p.is_empty()).map(String::from).collect();
            ValueData::MultiSz(parts)
        }
        _ => ValueData::Binary(data.to_vec()),         // REG_BINARY + fallthrough
    }
}

fn decode_wide(bytes: &[u8]) -> String {
    let mut v = Vec::with_capacity(bytes.len() / 2);
    for chunk in bytes.chunks_exact(2) {
        v.push(u16::from_le_bytes([chunk[0], chunk[1]]));
    }
    let mut s = String::from_utf16_lossy(&v);
    while s.ends_with('\0') { s.pop(); }
    s
}

/// Read a `REG_SZ` or `REG_EXPAND_SZ` value.
pub fn read_string(key: &Key, name: &str) -> Result<String> {
    let name_w = crate::util::wide_null(name);
    let mut kind: REG_VALUE_TYPE = REG_SZ;
    let mut size: u32 = 0;
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            None,
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW size {name}"))?;
    let kind_u = kind.0;
    if kind_u != REG_SZ.0 && kind_u != REG_EXPAND_SZ.0 {
        return Err(Error::Other(format!("{name} is not a string (kind=0x{kind_u:x})")));
    }
    let mut buf = vec![0u8; size as usize];
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            Some(buf.as_mut_ptr()),
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW read {name}"))?;
    let words: Vec<u16> = buf.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
    Ok(wide_to_string(&words))
}

/// Read a `REG_DWORD` value.
pub fn read_dword(key: &Key, name: &str) -> Result<u32> {
    let name_w = crate::util::wide_null(name);
    let mut kind: REG_VALUE_TYPE = REG_DWORD;
    let mut size: u32 = 4;
    let mut v: u32 = 0;
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            Some(&mut v as *mut _ as *mut u8),
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW dword {name}"))?;
    if kind.0 != REG_DWORD.0 {
        return Err(Error::Other(format!("{name} is not a REG_DWORD (kind=0x{:x})", kind.0)));
    }
    Ok(v)
}

/// Read a `REG_QWORD` value.
pub fn read_qword(key: &Key, name: &str) -> Result<u64> {
    let name_w = crate::util::wide_null(name);
    let mut kind: REG_VALUE_TYPE = REG_QWORD;
    let mut size: u32 = 8;
    let mut v: u64 = 0;
    let r = unsafe {
        RegQueryValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            None,
            Some(&mut kind),
            Some(&mut v as *mut _ as *mut u8),
            Some(&mut size),
        )
    };
    check(r, format!("RegQueryValueExW qword {name}"))?;
    if kind.0 != REG_QWORD.0 {
        return Err(Error::Other(format!("{name} is not a REG_QWORD (kind=0x{:x})", kind.0)));
    }
    Ok(v)
}

/// Write a value of the appropriate type.
pub fn write_value(key: &Key, name: &str, data: &ValueData) -> Result<()> {
    let name_w = crate::util::wide_null(name);
    let (kind, bytes) = match data {
        ValueData::Sz(s) => (REG_SZ, encode_wide_bytes(s)),
        ValueData::ExpandSz(s) => (REG_EXPAND_SZ, encode_wide_bytes(s)),
        ValueData::Dword(v) => (REG_DWORD, v.to_le_bytes().to_vec()),
        ValueData::Qword(v) => (REG_QWORD, v.to_le_bytes().to_vec()),
        ValueData::MultiSz(v) => {
            let mut bytes = Vec::new();
            for s in v {
                bytes.extend_from_slice(&encode_wide_bytes(s));
            }
            bytes.extend_from_slice(&[0, 0]);
            (REG_MULTI_SZ, bytes)
        }
        ValueData::Binary(b) => (REG_BINARY, b.clone()),
        ValueData::None => (REG_NONE, Vec::new()),
    };
    let r = unsafe {
        RegSetValueExW(
            key.0,
            windows::core::PCWSTR(name_w.as_ptr()),
            0,
            kind,
            Some(&bytes),
        )
    };
    check(r, format!("RegSetValueExW (kind={kind:?})"))
}

fn encode_wide_bytes(s: &str) -> Vec<u8> {
    s.encode_utf16().flat_map(|c| c.to_le_bytes()).chain(std::iter::once(0u16).flat_map(|c| c.to_le_bytes())).collect()
}

/// Enumerate immediate sub-keys (non-recursive).
pub fn enum_subkeys(key: &Key) -> Result<Vec<String>> {
    let mut out = Vec::new();
    let mut idx: u32 = 0;
    loop {
        let mut name = vec![0u16; 256];
        let mut len = name.len() as u32;
        let mut last_write: windows::Win32::Foundation::FILETIME = unsafe { std::mem::zeroed() };
        let r = unsafe {
            RegEnumKeyExW(
                key.0,
                idx,
                windows::core::PWSTR(name.as_mut_ptr()),
                &mut len,
                None,
                windows::core::PWSTR::null(),
                None,
                Some(&mut last_write),
            )
        };
        if r.0 == 259 /* ERROR_NO_MORE_ITEMS */ {
            break;
        }
        if r.0 != 0 {
            return Err(Error::win32(r.0 as i32, "RegEnumKeyExW"));
        }
        let s = wide_to_string(&name);
        if !s.is_empty() {
            out.push(s);
        }
        idx += 1;
    }
    Ok(out)
}

/// Enumerate all value (name, kind, data) tuples in a key.
pub fn enum_values(key: &Key) -> Result<Vec<ValueInfo>> {
    let mut out = Vec::new();
    let mut idx: u32 = 0;
    loop {
        let mut name = vec![0u16; 16384];
        let mut name_len = name.len() as u32;
        let mut kind: u32 = 0;
        let mut data_len: u32 = 0;
        let r = unsafe {
            RegEnumValueW(
                key.0,
                idx,
                windows::core::PWSTR(name.as_mut_ptr()),
                &mut name_len,
                None,
                Some(&mut kind),
                None,
                Some(&mut data_len),
            )
        };
        if r.0 == 259 {
            break;
        }
        if r.0 != 0 {
            return Err(Error::win32(r.0 as i32, "RegEnumValueW size"));
        }
        let mut data = vec![0u8; data_len as usize];
        let mut name_len2 = name_len;
        let r = unsafe {
            RegEnumValueW(
                key.0,
                idx,
                windows::core::PWSTR(name.as_mut_ptr()),
                &mut name_len2,
                None,
                Some(&mut kind),
                Some(data.as_mut_ptr()),
                Some(&mut data_len),
            )
        };
        if r.0 == 0 {
            let name_str = wide_to_string(&name);
            let value_data = decode_value(kind, &data);
            out.push(ValueInfo {
                name: name_str,
                kind: value_kind_name(kind).to_string(),
                data: value_data,
            });
        }
        idx += 1;
    }
    Ok(out)
}

fn value_kind_name(kind: u32) -> &'static str {
    match kind {
        x if x == REG_SZ.0 => "REG_SZ",
        x if x == REG_EXPAND_SZ.0 => "REG_EXPAND_SZ",
        x if x == REG_DWORD.0 => "REG_DWORD",
        x if x == REG_QWORD.0 => "REG_QWORD",
        x if x == REG_MULTI_SZ.0 => "REG_MULTI_SZ",
        x if x == REG_BINARY.0 => "REG_BINARY",
        x if x == REG_NONE.0 => "REG_NONE",
        _ => "REG_UNKNOWN",
    }
}

fn decode_value(kind: u32, data: &[u8]) -> ValueData {
    if kind == REG_SZ.0 || kind == REG_EXPAND_SZ.0 {
        let words: Vec<u16> = data.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        let s = wide_to_string(&words);
        return if kind == REG_SZ.0 { ValueData::Sz(s) } else { ValueData::ExpandSz(s) };
    }
    if kind == REG_DWORD.0 && data.len() >= 4 {
        let v = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        return ValueData::Dword(v);
    }
    if kind == REG_QWORD.0 && data.len() >= 8 {
        let v = u64::from_le_bytes([data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]]);
        return ValueData::Qword(v);
    }
    if kind == REG_MULTI_SZ.0 {
        let words: Vec<u16> = data.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        let mut strings = Vec::new();
        let mut cur = Vec::new();
        for w in words {
            if w == 0 {
                if !cur.is_empty() {
                    strings.push(wide_to_string(&cur));
                    cur.clear();
                }
            } else {
                cur.push(w);
            }
        }
        return ValueData::MultiSz(strings);
    }
    if kind == REG_BINARY.0 {
        return ValueData::Binary(data.to_vec());
    }
    ValueData::None
}

/// Delete a single value.
pub fn delete_value(key: &Key, name: &str) -> Result<()> {
    let name_w = crate::util::wide_null(name);
    use windows::Win32::System::Registry::RegDeleteValueW;
    let r = unsafe { RegDeleteValueW(key.0, windows::core::PCWSTR(name_w.as_ptr())) };
    check(r, format!("RegDeleteValueW {name}"))
}

/// Recursively delete a sub-key and everything under it.
pub fn delete_tree(hive: Hive, sub: &str) -> Result<()> {
    let sub_w = crate::util::wide_null(sub);
    let r = unsafe {
        RegDeleteTreeW(
            HKEY(hive.hkey() as *mut _),
            windows::core::PCWSTR(sub_w.as_ptr()),
        )
    };
    check(r, format!("RegDeleteTreeW {hive}\\{sub}"))
}

/// Recursively export a key (and all its values + sub-keys) in standard `.reg` format.
pub fn export_reg(key: &Key, writer: &mut impl std::io::Write) -> Result<()> {
    writer.write_all(b"Windows Registry Editor Version 5.00\r\n\r\n").map_err(io_err)?;
    write_reg_recursive(key, writer, &[])?;
    Ok(())
}

fn io_err(e: std::io::Error) -> Error {
    Error::Io(e.to_string())
}

fn write_reg_recursive(key: &Key, w: &mut impl std::io::Write, path: &[String]) -> Result<()> {
    if !path.is_empty() {
        let path_str = path.join("\\");
        writeln!(w, "[{}]", path_str).map_err(io_err)?;
    }
    for v in enum_values(key)? {
        write_reg_value(w, &v)?;
    }
    writeln!(w).map_err(io_err)?;
    for sub in enum_subkeys(key)? {
        let sub_w = crate::util::wide_null(&sub);
        let mut child = HKEY(std::ptr::null_mut());
        let r = unsafe {
            RegOpenKeyExW(
                key.0,
                windows::core::PCWSTR(sub_w.as_ptr()),
                0,
                KEY_ENUMERATE_SUB_KEYS | KEY_QUERY_VALUE,
                &mut child,
            )
        };
        if r.0 != 0 {
            continue;
        }
        let child_key = Key(child);
        let mut next_path = path.to_vec();
        next_path.push(sub);
        write_reg_recursive(&child_key, w, &next_path)?;
    }
    Ok(())
}

fn write_reg_value(w: &mut impl std::io::Write, v: &ValueInfo) -> Result<()> {
    let name_quoted = if v.name.is_empty() { "@".to_string() } else { format!("\"{}\"", escape_reg(&v.name)) };
    let line = match &v.data {
        ValueData::Sz(s) => format!("{}={}:\"{}\"", name_quoted, "reg_sz", escape_reg(s)),
        ValueData::ExpandSz(s) => format!("{}={}:\"{}\"", name_quoted, "reg_expand_sz", escape_reg(s)),
        ValueData::Dword(d) => format!("{}=dword:{:08x}", name_quoted, d),
        ValueData::Qword(d) => format!("{}=qword:{:016x}", name_quoted, d),
        ValueData::MultiSz(vs) => {
            let inner = vs.iter().map(|s| format!("\"{}\"", escape_reg(s))).collect::<Vec<_>>().join(",");
            format!("{}={}:{}", name_quoted, "reg_multi_sz", inner)
        }
        ValueData::Binary(b) => {
            let hex: Vec<String> = b.iter().map(|x| format!("{:02x}", x)).collect();
            format!("{}={}:{}", name_quoted, "reg_binary", hex.join(","))
        }
        ValueData::None => return Ok(()),
    };
    writeln!(w, "{}", line).map_err(io_err)?;
    Ok(())
}

fn escape_reg(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsStr;
    use windows::Win32::System::Registry::{RegCreateKeyExW, HKEY_CURRENT_USER, REG_OPTION_NON_VOLATILE, REG_SAM_FLAGS};

    fn make_test_key(name: &str) -> String {
        let sub = format!("Software\\WindowsToolsTest_{}_{}", std::process::id(), name);
        let sub_w = crate::util::wide_null(&sub);
        let mut key = HKEY(std::ptr::null_mut());
        let r = unsafe {
            RegCreateKeyExW(
                HKEY_CURRENT_USER,
                windows::core::PCWSTR(sub_w.as_ptr()),
                0,
                windows::core::PCWSTR::null(),
                REG_OPTION_NON_VOLATILE,
                KEY_READ | KEY_WRITE,
                None,
                &mut key,
                None,
            )
        };
        assert_eq!(r.0, 0);
        let _ = Key(key); // close
        sub
    }

    #[test]
    fn read_write_string() {
        let sub = make_test_key("string");
        let k = open_key(Hive::CurrentUser, &sub, true).unwrap();
        write_value(&k, "hello", &ValueData::Sz("world".into())).unwrap();
        assert_eq!(read_string(&k, "hello").unwrap(), "world");
        delete_value(&k, "hello").unwrap();
        delete_tree(Hive::CurrentUser, &sub).unwrap();
    }

    #[test]
    fn read_write_dword() {
        let sub = make_test_key("dword");
        let k = open_key(Hive::CurrentUser, &sub, true).unwrap();
        write_value(&k, "n", &ValueData::Dword(0x1234abcd)).unwrap();
        assert_eq!(read_dword(&k, "n").unwrap(), 0x1234abcd);
        delete_value(&k, "n").unwrap();
        delete_tree(Hive::CurrentUser, &sub).unwrap();
    }
}
