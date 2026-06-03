//! `performance.*` commands: streaming PDH samples to the frontend.

use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::State;
use crate::state::AppState;
use crate::stream;
use crate::rpc::PerfHandle;

#[tauri::command]
pub fn performance_stream(state: State<'_, AppState>, channel: Channel<serde_json::Value>) -> wt_core::Result<()> {
    // Ensure we have a sampler.  The slot stores an `Arc<PerfHandle>`
    // so we can move a clone into the background stream thread
    // without holding the parking_lot guard.
    let handle: Arc<PerfHandle> = {
        let mut slot = state.sampler.lock();
        if slot.is_none() {
            let h = PerfHandle::new()?;
            *slot = Some(Arc::new(h));
        }
        Arc::clone(slot.as_ref().unwrap())
    };

    let h = stream::spawn_periodic(channel, Duration::from_millis(1000), move || {
        handle.sample().ok().and_then(|s| serde_json::to_value(s).ok())
    });
    std::mem::forget(h);
    Ok(())
}
