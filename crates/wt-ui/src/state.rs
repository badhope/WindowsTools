//! Application-wide state managed by Tauri.

use std::sync::Arc;
use parking_lot::Mutex;

/// State held by Tauri and exposed to every `#[tauri::command]`.
pub struct AppState {
    /// The command manifest loaded from the embedded JSON at startup.
    pub manifest: Arc<crate::manifest::Manifest>,
    /// Lazily initialised on first `performance.stream` call.
    pub sampler: Mutex<Option<std::sync::Arc<crate::rpc::PerfHandle>>>,
}

impl AppState {
    /// Create a new AppState wrapping the given manifest.
    pub fn new(manifest: Arc<crate::manifest::Manifest>) -> Self {
        Self { manifest, sampler: Mutex::new(None) }
    }
}
