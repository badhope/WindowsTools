//! Bridge `tauri::ipc::Channel<T>` to a background thread that pumps
//! `sample()` calls at a fixed interval.

use std::time::Duration;
use tauri::ipc::Channel;

/// Spawn a background thread that calls `sample()` every `interval`
/// and pushes the result into the channel.  The thread exits when
/// the channel is closed (typically when the Vue component unmounts).
///
/// This function is intentionally fire-and-forget: the returned
/// `JoinHandle` is leaked so the thread lives for the duration of
/// the Tauri process.  On Tauri shutdown the OS reaps it.
pub fn spawn_periodic<T, F>(
    channel: Channel<T>,
    interval: Duration,
    mut sample: F,
) -> std::thread::JoinHandle<()>
where
    T: serde::Serialize + Send + 'static,
    F: FnMut() -> Option<T> + Send + 'static,
{
    std::thread::Builder::new()
        .name("wt-stream".into())
        .spawn(move || loop {
            if let Some(v) = sample() {
                if channel.send(v).is_err() { return; }
            }
            std::thread::sleep(interval);
        })
        .expect("spawn wt-stream thread")
}
