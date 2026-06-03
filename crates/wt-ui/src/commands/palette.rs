//! `palette.*` commands: list and search the command manifest.

use tauri::State;
use crate::manifest::ManifestItem;
use crate::palette as pl;
use crate::state::AppState;
use crate::types::PaletteSearchArgs;

#[tauri::command]
pub fn palette_list_commands(state: State<'_, AppState>) -> Vec<ManifestItem> {
    pl::list_commands(&state.manifest)
}

#[tauri::command]
pub fn palette_search(state: State<'_, AppState>, args: PaletteSearchArgs) -> Vec<ManifestItem> {
    pl::search(&state.manifest, &args.q, args.limit)
}
