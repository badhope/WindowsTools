//! Error type used across all WindowsTools crates.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::io;
use thiserror::Error;

/// Result alias for `Error`.
pub type Result<T> = std::result::Result<T, Error>;

/// Top-level error. Serializable so it can cross the JSON-RPC boundary
/// and reach the frontend as a structured object (not a string).
#[derive(Debug, Error, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "snake_case")]
pub enum Error {
    /// The user is not an administrator and the operation requires it.
    #[error("administrator privileges required: {operation}")]
    NotAdmin { operation: String },

    /// The operation was cancelled (by the user or by shutdown).
    #[error("operation cancelled")]
    Cancelled,

    /// Caller asked for something that doesn't exist.
    #[error("not found: {resource}")]
    NotFound { resource: String },

    /// Caller asked for something that exists but is not allowed.
    #[error("access denied to {resource}")]
    AccessDenied { resource: String },

    /// Permission/ownership is wrong but might be fixable.
    #[error("permission denied: {resource}: {reason}")]
    PermissionDenied { resource: String, reason: String },

    /// Caller input was malformed.
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// Operation timed out.
    #[error("operation timed out after {0:?}")]
    Timeout(std::time::Duration),

    /// Something is unsupported on this OS / build.
    #[error("unsupported: {0}")]
    Unsupported(String),

    /// Pipe / IPC error.
    #[error("ipc error: {0}")]
    Ipc(String),

    /// Pipe authentication failed.
    #[error("ipc auth failed: {0}")]
    IpcAuth(String),

    /// Underlying Windows API failure with HRESULT.
    #[error("win32 error 0x{code:08x} in {context}")]
    Win32 { code: i32, context: String },

    /// Underlying IO error.
    #[error("io error: {0}")]
    Io(String),

    /// Underlying JSON (de)serialization error.
    #[error("json error: {0}")]
    Json(String),

    /// Generic catch-all. Prefer the typed variants above.
    #[error("other: {0}")]
    Other(String),
}

impl Error {
    /// Construct a Win32 error from a HRESULT-like code.
    pub fn win32(code: i32, context: impl Into<String>) -> Self {
        Self::Win32 { code, context: context.into() }
    }

    /// Construct from a `&str`.
    pub fn msg(s: impl Into<String>) -> Self {
        Self::Other(s.into())
    }

    /// Returns `true` if the error is transient and the caller may retry.
    pub fn is_transient(&self) -> bool {
        matches!(self, Self::Timeout(_) | Self::Ipc(_))
    }
}

impl From<io::Error> for Error {
    fn from(e: io::Error) -> Self {
        match e.kind() {
            io::ErrorKind::NotFound => Self::NotFound { resource: e.to_string() },
            io::ErrorKind::PermissionDenied => Self::PermissionDenied {
                resource: "<io>".into(),
                reason: e.to_string(),
            },
            io::ErrorKind::TimedOut => Self::Timeout(std::time::Duration::from_secs(30)),
            _ => Self::Io(e.to_string()),
        }
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e.to_string())
    }
}

/// Convenience: turn a Windows HRESULT into our error.
pub fn hresult(code: i32, ctx: &str) -> Error {
    Error::win32(code, ctx)
}

/// `bail!` macro: returns from the current function with our error type.
#[macro_export]
macro_rules! bail {
    ($variant:ident { $($field:ident : $value:expr),+ $(,)? }) => {
        return Err($crate::Error::$variant { $($field : $value),+ })
    };
    ($($arg:tt)+) => {
        return Err($crate::Error::msg(format!($($arg)+)))
    };
}

/// A typed context wrapper for fallible operations.
pub trait Context<T> {
    /// Wrap the error with a `context` string.
    fn ctx(self, context: &str) -> Result<T>;
}

impl<T, E: fmt::Display> Context<T> for std::result::Result<T, E> {
    fn ctx(self, context: &str) -> Result<T> {
        self.map_err(|e| Error::Other(format!("{context}: {e}")))
    }
}
