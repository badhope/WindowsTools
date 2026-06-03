//! Core types, errors, traits, IPC contracts shared across all WindowsTools crates.
//!
//! This crate has **no** Win32 dependency. It is the contract layer.

#![deny(rust_2018_idioms)]
#![warn(missing_docs)]

pub mod error;
pub mod ids;
pub mod ipc;
pub mod privilege;
pub mod registry_path;
pub mod result_ext;
pub mod secret;
pub mod telemetry;
pub mod text;

pub use error::{Error, Result};
pub use ids::{CommandId, OperationId, RequestId};
pub use privilege::{Integrity, Risk};
