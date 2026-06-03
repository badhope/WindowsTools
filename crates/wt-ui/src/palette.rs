//! Command palette wrappers around the manifest.

use std::sync::Arc;
use crate::manifest::ManifestItem;

/// List every command in the manifest. Used to seed the palette.
pub fn list_commands(manifest: &Arc<crate::manifest::Manifest>) -> Vec<ManifestItem> {
    manifest.items.clone()
}

/// Fuzzy-search the manifest for entries matching `q`.
pub fn search(manifest: &Arc<crate::manifest::Manifest>, q: &str, limit: usize) -> Vec<ManifestItem> {
    manifest.search(q, limit)
}
