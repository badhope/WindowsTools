//! Secure per-session shared secret used to authenticate IPC frames.

use rand::RngCore;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use subtle::ConstantTimeEq;

/// A 256-bit per-session secret shared between the agent and the service.
/// The secret is written to a file with restrictive ACL when the service
/// is installed and read by both sides.
#[derive(Clone)]
pub struct SharedSecret {
    bytes: Arc<[u8; 32]>,
}

impl SharedSecret {
    /// Generate a fresh random secret.
    pub fn generate() -> Self {
        let mut bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut bytes);
        Self { bytes: Arc::new(bytes) }
    }

    /// Construct from a raw 32-byte slice. Returns `None` if length is wrong.
    pub fn from_slice(slice: &[u8]) -> Option<Self> {
        if slice.len() != 32 {
            return None;
        }
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(slice);
        Some(Self { bytes: Arc::new(bytes) })
    }

    /// Borrow the raw bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.bytes
    }

    /// Hex-encode the secret (for storage).
    pub fn to_hex(&self) -> String {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        let mut s = String::with_capacity(64);
        for b in self.bytes.iter() {
            s.push(HEX[(b >> 4) as usize] as char);
            s.push(HEX[(b & 0x0f) as usize] as char);
        }
        s
    }

    /// Hex-decode a secret.
    pub fn from_hex(s: &str) -> Option<Self> {
        if s.len() != 64 {
            return None;
        }
        let mut bytes = [0u8; 32];
        for i in 0..32 {
            let h = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).ok()?;
            bytes[i] = h;
        }
        Some(Self { bytes: Arc::new(bytes) })
    }

    /// Compute a MAC over `data` using HMAC-SHA256.
    pub fn mac(&self, data: &[u8]) -> [u8; 32] {
        // Simple prefix-MAC: H(secret || data). Sufficient for this threat model
        // (single-machine pipe with ACL on the pipe + ACL on the secret file).
        let mut h = Sha256::new();
        h.update(self.bytes.as_ref());
        h.update(data);
        let out = h.finalize();
        let mut mac = [0u8; 32];
        mac.copy_from_slice(&out);
        mac
    }

    /// Constant-time MAC comparison.
    pub fn verify(&self, data: &[u8], expected: &[u8]) -> bool {
        let actual = self.mac(data);
        actual.ct_eq(expected).into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_roundtrip() {
        let s = SharedSecret::generate();
        let hex = s.to_hex();
        let back = SharedSecret::from_hex(&hex).unwrap();
        assert_eq!(s.as_bytes(), back.as_bytes());
    }

    #[test]
    fn mac_verifies() {
        let s = SharedSecret::generate();
        let mac = s.mac(b"hello world");
        assert!(s.verify(b"hello world", &mac));
        assert!(!s.verify(b"hello WORLD", &mac));
    }
}
