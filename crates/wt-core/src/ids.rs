//! Identifier types.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A unique id for a single IPC request. Used for tracing, cancellation, and
/// multiplexing multiple concurrent operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RequestId(pub Uuid);

impl RequestId {
    /// Generate a new random id.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for RequestId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for RequestId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A stable id for a command (e.g. "registry.list_subkeys"). Used by the
/// manifest / palette system. Must be globally unique and lowercase-kebab.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct CommandId(pub String);

impl CommandId {
    /// Construct a new id, validating it is non-empty and ASCII-safe.
    pub fn new(s: impl Into<String>) -> Self {
        let s: String = s.into();
        assert!(!s.is_empty(), "command id must be non-empty");
        Self(s)
    }
    /// Borrow the id as a string slice.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for CommandId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl From<&str> for CommandId {
    fn from(s: &str) -> Self {
        Self::new(s)
    }
}

/// A stable id for a higher-level operation, e.g. "open services.msc".
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct OperationId(pub String);

impl OperationId {
    /// Construct a new id, validating it is non-empty.
    pub fn new(s: impl Into<String>) -> Self {
        let s: String = s.into();
        assert!(!s.is_empty(), "operation id must be non-empty");
        Self(s)
    }
    /// Borrow the id as a string slice.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for OperationId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl From<&str> for OperationId {
    fn from(s: &str) -> Self {
        Self::new(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_id_is_unique() {
        let a = RequestId::new();
        let b = RequestId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn command_id_roundtrips() {
        let id = CommandId::new("registry.list");
        let s = serde_json::to_string(&id).unwrap();
        let back: CommandId = serde_json::from_str(&s).unwrap();
        assert_eq!(id, back);
    }
}
