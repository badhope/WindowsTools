//! `wt-ui` is the Tauri 2 host for WindowsTools. It owns:
//!
//! * the Tauri builder / window / IPC plumbing,
//! * the in-process [`wt_agent`] client (no fork-and-execute needed),
//! * the command-palette manifest,
//! * the 35 `#[tauri::command]`s that the Vue 3.5 frontend calls,
//! * the streaming `tauri::ipc::Channel<T>` sources for live data
//!   (perf counters, service-state changes, event-log tail).
//!
//! The Tauri host never spawns `wt-agent` as a child process. The agent
//! is consumed as a library: every UI command is a thin wrapper that
//! delegates to the appropriate `wt_agent::*` high-level function.
//! `wt-agent` itself decides whether the call runs locally (HKCU, env,
//! ping) or is forwarded to the named-pipe / SYSTEM service (HKLM,
//! service.write, hosts.write, repair.*).
//!
//! For the agent's *own* binary (one-shot CLI used for ops/debugging
//! and for the future headless installer), see the `wt-agent` crate.

pub mod commands;
pub mod manifest;
pub mod palette;
pub mod rpc;
pub mod state;
pub mod stream;
pub mod types;

use std::sync::Arc;
use tauri::Manager;

/// Application entry point called by `main.rs` and by integration tests.
pub fn run() {
    init_tracing();
    tracing::info!(target: "wt_ui", "starting WindowsTools v{}", env!("CARGO_PKG_VERSION"));

    // Eagerly load the command manifest so a malformed manifest fails
    // fast (at process start), not lazily on the first user click.
    let manifest = Arc::new(manifest::load());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let state = state::AppState::new(manifest.clone());
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::ping,
            commands::system::whoami,
            commands::system::system_info,
            commands::system::system_integrity,
            commands::system::system_env,
            commands::system::system_set_env,
            commands::processes::processes_list,
            commands::processes::processes_kill,
            commands::services::services_list,
            commands::services::services_config,
            commands::services::services_start,
            commands::services::services_stop,
            commands::services::services_set_start_type,
            commands::registry::registry_get,
            commands::registry::registry_set,
            commands::registry::registry_delete_value,
            commands::registry::registry_delete_tree,
            commands::registry::registry_list_subkeys,
            commands::network::network_adapters,
            commands::network::network_tcp_table,
            commands::network::network_udp_table,
            commands::disk::disk_drives,
            commands::disk::disk_free,
            commands::startup::startup_list,
            commands::startup::startup_enable,
            commands::startup::startup_disable,
            commands::performance::performance_stream,
            commands::hosts::hosts_list,
            commands::hosts::hosts_write,
            commands::repair::repair_sfc,
            commands::repair::repair_dism,
            commands::launch::launch_run,
            commands::task::task_list,
            commands::task::task_run_now,
            commands::palette::palette_list_commands,
            commands::palette::palette_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};
    let _ = fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_target(false)
        .with_writer(std::io::stderr)
        .try_init();
}
