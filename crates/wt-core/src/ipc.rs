//! IPC contract types shared between `wt-agent` (regular user) and
//! `wt-service` (SYSTEM). All types are `Serialize + Deserialize`.
//!
//! Wire format: length-prefixed JSON frames on a named pipe.
//! See `wt-core::ipc::codec` for the framing protocol.

use crate::ids::RequestId;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Top-level envelope. Every request and response is a single envelope.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Envelope {
    /// Caller -> Service: a request.
    Request(Request),
    /// Service -> Caller: a response to a request.
    Response(Response),
    /// Service -> Caller: a streamed event (progress, log, sample).
    Event(Event),
}

impl Envelope {
    /// Return the request id this envelope refers to, if any.
    pub fn id(&self) -> Option<RequestId> {
        match self {
            Envelope::Request(r) => Some(r.id),
            Envelope::Response(Response::Ok { id, .. }) => Some(*id),
            Envelope::Response(Response::Err { id, .. }) => Some(*id),
            Envelope::Event(e) => Some(e.id),
        }
    }
}

/// A request to the service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    /// Unique id for this request.
    pub id: RequestId,
    /// The operation to perform.
    pub op: String,
    /// Operation parameters.
    pub params: BTreeMap<String, serde_json::Value>,
    /// Caller process id (used for ACL).
    pub caller_pid: u32,
    /// Caller session id.
    pub caller_sid: String,
    /// HMAC of (op || params || nonce) using a per-session shared secret.
    pub mac: Vec<u8>,
    /// Per-request random nonce.
    pub nonce: [u8; 16],
}

/// A response to a request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum Response {
    /// Operation succeeded; carries the typed result.
    Ok {
        /// Mirrors `Request.id`.
        id: RequestId,
        /// Result payload.
        result: serde_json::Value,
    },
    /// Operation failed; carries the typed error.
    Err {
        /// Mirrors `Request.id`.
        id: RequestId,
        /// The error.
        error: crate::Error,
    },
}

impl Response {
    /// Convenience constructor for `Ok`.
    pub fn ok(id: RequestId, result: impl Serialize) -> Self {
        Self::Ok {
            id,
            result: serde_json::to_value(result).unwrap_or(serde_json::Value::Null),
        }
    }
    /// Convenience constructor for `Err`.
    pub fn err(id: RequestId, error: crate::Error) -> Self {
        Self::Err { id, error }
    }
}

/// A streamed event related to a request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    /// The request id this event belongs to.
    pub id: RequestId,
    /// Sequence number (starts at 0, monotonic per request).
    pub seq: u32,
    /// Event kind tag (e.g. "progress", "log", "sample").
    pub kind: String,
    /// Event payload.
    pub payload: serde_json::Value,
}

/// A progress update from a long-running operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Progress {
    /// 0..=100.
    pub percent: f32,
    /// Human-readable message.
    pub message: String,
    /// Optional stage label.
    pub stage: Option<String>,
}

/// A log line emitted by an operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogLine {
    /// Log level.
    pub level: LogLevel,
    /// Human-readable line.
    pub message: String,
}

/// Log severity (subset of `tracing` levels).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    /// Trace.
    Trace,
    /// Debug.
    Debug,
    /// Info.
    Info,
    /// Warn.
    Warn,
    /// Error.
    Error,
}

impl From<tracing::Level> for LogLevel {
    fn from(l: tracing::Level) -> Self {
        match l {
            tracing::Level::TRACE => Self::Trace,
            tracing::Level::DEBUG => Self::Debug,
            tracing::Level::INFO => Self::Info,
            tracing::Level::WARN => Self::Warn,
            tracing::Level::ERROR => Self::Error,
        }
    }
}
