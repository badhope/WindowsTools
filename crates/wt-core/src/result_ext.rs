//! Extension traits for ergonomic error handling.

use crate::{Error, Result};

/// Extension methods on `Option<T>` to convert into `Result<T, Error>`.
pub trait OptionExt<T> {
    /// Convert `None` into `Error::NotFound`.
    fn some_or_not_found(self, resource: impl Into<String>) -> Result<T>;
}

impl<T> OptionExt<T> for Option<T> {
    fn some_or_not_found(self, resource: impl Into<String>) -> Result<T> {
        self.ok_or_else(|| Error::NotFound { resource: resource.into() })
    }
}

/// Extension methods on `Result<T, E>` to convert errors into our `Error`.
pub trait IntoCore<T> {
    /// Map any `E: Display` into `Error::Other`.
    fn into_core(self) -> Result<T>;
}

impl<T, E: std::fmt::Display> IntoCore<T> for std::result::Result<T, E> {
    fn into_core(self) -> Result<T> {
        self.map_err(|e| Error::Other(format!("{e}")))
    }
}
