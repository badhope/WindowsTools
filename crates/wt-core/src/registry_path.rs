//! Canonical representation for Windows registry paths.
//!
//! Internally we use a normalized form: `HIVE\Sub\Path` with backslashes.
//! On the wire to the UI we expose `HKLM`, `HKCU`, `HKCR`, `HKU`, `HKCC`.

use crate::Error;
use serde::{Deserialize, Serialize};
use std::fmt;

/// The five predefined registry hives.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Hive {
    /// `HKEY_CLASSES_ROOT`.
    ClassesRoot,
    /// `HKEY_CURRENT_USER`.
    CurrentUser,
    /// `HKEY_LOCAL_MACHINE`.
    LocalMachine,
    /// `HKEY_USERS`.
    Users,
    /// `HKEY_CURRENT_CONFIG`.
    CurrentConfig,
}

impl Hive {
    /// Short alias used by the UI (matches `regedit`).
    pub fn alias(self) -> &'static str {
        match self {
            Hive::ClassesRoot => "HKCR",
            Hive::CurrentUser => "HKCU",
            Hive::LocalMachine => "HKLM",
            Hive::Users => "HKU",
            Hive::CurrentConfig => "HKCC",
        }
    }
    /// Long name used in the Win32 API.
    pub fn long_name(self) -> &'static str {
        match self {
            Hive::ClassesRoot => "HKEY_CLASSES_ROOT",
            Hive::CurrentUser => "HKEY_CURRENT_USER",
            Hive::LocalMachine => "HKEY_LOCAL_MACHINE",
            Hive::Users => "HKEY_USERS",
            Hive::CurrentConfig => "HKEY_CURRENT_CONFIG",
        }
    }
    /// Returns `true` if accessing this hive typically requires admin.
    pub fn requires_admin(self) -> bool {
        matches!(self, Hive::ClassesRoot | Hive::LocalMachine)
    }
    /// Returns the `HKEY_*` integer value for use with the Win32 API.
    /// HKEY_CLASSES_ROOT    = 0x80000000
    /// HKEY_CURRENT_USER    = 0x80000001
    /// HKEY_LOCAL_MACHINE   = 0x80000002
    /// HKEY_USERS           = 0x80000003
    /// HKEY_CURRENT_CONFIG  = 0x80000005
    pub fn hkey(self) -> isize {
        match self {
            Hive::ClassesRoot   => 0x80000000isize,
            Hive::CurrentUser   => 0x80000001isize,
            Hive::LocalMachine  => 0x80000002isize,
            Hive::Users         => 0x80000003isize,
            Hive::CurrentConfig => 0x80000005isize,
        }
    }
}

impl fmt::Display for Hive {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.alias())
    }
}

/// A canonical, validated registry path.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RegistryPath {
    hive: Hive,
    sub: String,
}

impl RegistryPath {
    /// Parse a path like `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion`.
    pub fn parse(input: &str) -> Result<Self, Error> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err(Error::InvalidInput("empty registry path".into()));
        }
        let (hive_str, rest) = trimmed
            .split_once(['\\', '/'])
            .map(|(h, r)| (h, r))
            .unwrap_or((trimmed, ""));
        let hive = match hive_str.to_ascii_uppercase().as_str() {
            "HKCR" | "HKEY_CLASSES_ROOT" => Hive::ClassesRoot,
            "HKCU" | "HKEY_CURRENT_USER" => Hive::CurrentUser,
            "HKLM" | "HKEY_LOCAL_MACHINE" => Hive::LocalMachine,
            "HKU" | "HKEY_USERS" => Hive::Users,
            "HKCC" | "HKEY_CURRENT_CONFIG" => Hive::CurrentConfig,
            other => return Err(Error::InvalidInput(format!("unknown hive: {other}"))),
        };
        if rest.is_empty() {
            return Ok(Self { hive, sub: String::new() });
        }
        let sub = rest.replace('/', "\\");
        for seg in sub.split('\\') {
            if seg.is_empty() {
                return Err(Error::InvalidInput("empty sub-key segment".into()));
            }
            if seg.contains('\0') {
                return Err(Error::InvalidInput("NUL in registry path".into()));
            }
        }
        Ok(Self { hive, sub })
    }

    /// Construct from a hive + sub-key. The sub-key may not be empty.
    pub fn new(hive: Hive, sub: impl Into<String>) -> Self {
        Self { hive, sub: sub.into() }
    }

    /// Borrow the hive.
    pub fn hive(&self) -> Hive {
        self.hive
    }
    /// Borrow the sub-key (without the hive).
    pub fn sub(&self) -> &str {
        &self.sub
    }
    /// Returns `true` if accessing this path typically requires admin.
    pub fn requires_admin(&self) -> bool {
        self.hive.requires_admin()
    }
}

impl fmt::Display for RegistryPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.sub.is_empty() {
            f.write_str(self.hive.alias())
        } else {
            write!(f, "{}\\{}", self.hive.alias(), self.sub)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_canonical_paths() {
        let p = RegistryPath::parse("HKLM\\SOFTWARE\\Microsoft\\Windows").unwrap();
        assert_eq!(p.hive(), Hive::LocalMachine);
        assert_eq!(p.sub(), "SOFTWARE\\Microsoft\\Windows");
        assert!(p.requires_admin());

        let p2 = RegistryPath::parse("hkcu/Software/Test").unwrap();
        assert_eq!(p2.hive(), Hive::CurrentUser);
        assert_eq!(p2.sub(), "Software\\Test");
        assert!(!p2.requires_admin());
    }

    #[test]
    fn rejects_empty_and_bad_hive() {
        assert!(RegistryPath::parse("").is_err());
        assert!(RegistryPath::parse("BOGUS\\Foo").is_err());
        assert!(RegistryPath::parse("HKLM\\Foo\\").is_err());
    }

    #[test]
    fn roundtrips() {
        let p = RegistryPath::parse("HKCR\\*\\shell\\Open").unwrap();
        assert_eq!(p.to_string(), "HKCR\\*\\shell\\Open");
    }
}
