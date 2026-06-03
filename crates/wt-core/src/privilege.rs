//! Privilege / integrity level helpers.

use serde::{Deserialize, Serialize};

/// Process integrity level (Windows concept).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Integrity {
    /// Untrusted (sandboxed).
    Untrusted,
    /// Low integrity (e.g. Protected Mode IE).
    Low,
    /// Medium integrity (normal user, UAC restricted).
    Medium,
    /// Medium integrity + UAC elevated (admin in non-strict mode).
    MediumPlus,
    /// High integrity (admin).
    High,
    /// System integrity (services).
    System,
    /// Unknown / could not be determined.
    Unknown,
}

impl Integrity {
    /// The mandatory label SID sub-authority value used in Windows.
    pub fn sacl_value(self) -> Option<u32> {
        match self {
            Integrity::Untrusted => Some(0x0000),
            Integrity::Low => Some(0x1000),
            Integrity::Medium => Some(0x2000),
            Integrity::MediumPlus => Some(0x2100),
            Integrity::High => Some(0x3000),
            Integrity::System => Some(0x4000),
            Integrity::Unknown => None,
        }
    }

    /// Returns `true` if this level can write to HKLM and friends.
    pub fn can_administer(self) -> bool {
        matches!(self, Integrity::High | Integrity::System)
    }
}

/// Risk level for a manifest entry, used by the UI to decide whether to
/// require an extra confirmation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Risk {
    /// Read-only, no side effects.
    Safe,
    /// Read-only but exposes sensitive info.
    Read,
    /// Modifies user state, easily reversible.
    Low,
    /// Modifies system state, may be reversible via backup.
    Medium,
    /// Destructive or hard-to-reverse.
    High,
}
