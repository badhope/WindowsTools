//! Encoding helpers: UTF-16 <-> UTF-8, BOM stripping, etc.
//!
//! Windows APIs return UTF-16; we expose UTF-8 to the rest of the app.

use encoding_rs::UTF_16LE;
use std::borrow::Cow;
use widestring::{U16CString, U16Str, U16String};

/// Decode a UTF-16LE buffer (possibly with BOM) into a UTF-8 `String`.
/// Invalid sequences are replaced with U+FFFD rather than failing.
pub fn decode_wide(bytes: &[u8]) -> String {
    // Strip a leading UTF-16LE BOM (FF FE) if present.
    let stripped: &[u8] = if bytes.starts_with(&[0xFF, 0xFE]) { &bytes[2..] } else { bytes };
    // Make sure the length is a multiple of 2.
    let aligned = if stripped.len() % 2 == 0 { Cow::Borrowed(stripped) } else { Cow::Owned(stripped[..stripped.len() - 1].to_vec()) };
    let (cow, _enc, had_errors) = UTF_16LE.decode(&aligned);
    if had_errors {
        // Already replaced with U+FFFD, so this is fine.
        cow.into_owned()
    } else {
        cow.into_owned()
    }
}

/// Encode a UTF-8 `str` into a UTF-16LE `Vec<u16>` (no BOM).
pub fn encode_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().collect()
}

/// Decode a `Vec<u16>` (no BOM assumed) into a UTF-8 `String`.
pub fn decode_wide_vec(words: &[u16]) -> String {
    let s = U16Str::from_slice(words);
    s.to_string_lossy()
}

/// Wrap a `Vec<u16>` as a `U16CString` (null-terminated, allocating if needed).
pub fn to_cstring(words: Vec<u16>) -> U16CString {
    U16CString::from_vec_truncate(words)
}

/// Borrow a `U16CStr` from a `Vec<u16>` without copying.
pub fn as_cstr(words: &[u16]) -> U16CString {
    U16CString::from_vec_truncate(words.to_vec())
}

/// Convert a UTF-8 string into a `U16String`.
pub fn to_wstring(s: &str) -> U16String {
    U16String::from_str(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let s = "Windows Tools \u{4e2d}\u{6587}";
        let w = encode_wide(s);
        let back = decode_wide_vec(&w);
        assert_eq!(s, back);
    }
}
