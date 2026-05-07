use serde::{Deserialize, Serialize};
use tauri::command;

mod system;
mod registry;
mod process;
mod service;
mod network;
mod disk;
mod utils;
mod helpers;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub success: bool,
    pub output: String,
    pub error: String,
    pub exit_code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
    pub computer_name: String,
    pub user_name: String,
    pub cpu: String,
    pub ram: u64,
    pub architecture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryValue {
    pub name: String,
    pub value_type: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: String,
    pub start_type: String,
    pub can_stop: bool,
    pub can_pause: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu: f32,
    pub memory: u64,
    pub path: String,
    pub user: String,
    pub priority: String,
    pub threads: u32,
    pub handles: u32,
    pub start_time: String,
    pub run_time: String,
    pub command_line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkConnection {
    pub protocol: String,
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub state: String,
    pub pid: u32,
    pub process_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub total_space: u64,
    pub free_space: u64,
    pub used_space: u64,
    pub file_system: String,
    pub drive_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAdapter {
    pub name: String,
    pub description: String,
    pub mac_address: String,
    pub status: String,
    pub speed: i64,
    pub ip_addresses: Vec<String>,
    pub gateway: String,
    pub dns_servers: Vec<String>,
}

#[command]
fn get_system_info() -> Result<SystemInfo, String> {
    system::get_system_info()
}

#[command]
fn is_admin() -> Result<bool, String> {
    system::is_admin()
}

#[command]
fn restart_as_admin() -> Result<(), String> {
    system::restart_as_admin()
}

#[command]
fn execute_powershell(command: String) -> Result<CommandResult, String> {
    system::execute_powershell(&command)
}

#[command]
fn open_system_tool(command: String) -> Result<(), String> {
    system::open_system_tool(&command)
}

#[command]
fn get_registry_tree() -> Result<Vec<serde_json::Value>, String> {
    registry::get_registry_tree()
}

#[command]
fn get_registry_values(path: String) -> Result<Vec<RegistryValue>, String> {
    registry::get_registry_values(&path)
}

#[command]
fn set_registry_value(path: String, name: String, value_type: String, value: String) -> Result<(), String> {
    registry::set_registry_value(&path, &name, &value_type, &value)
}

#[command]
fn create_registry_value(path: String, name: String, value_type: String, value: String) -> Result<(), String> {
    registry::create_registry_value(&path, &name, &value_type, &value)
}

#[command]
fn delete_registry_value(path: String, name: String) -> Result<(), String> {
    registry::delete_registry_value(&path, &name)
}

#[command]
fn export_registry_key(path: String) -> Result<String, String> {
    registry::export_registry_key(&path)
}

#[command]
fn get_registry_subkeys(path: String) -> Result<Vec<serde_json::Value>, String> {
    registry::get_registry_subkeys(&path)
}

#[command]
fn get_services() -> Result<Vec<ServiceInfo>, String> {
    service::get_services()
}

#[command]
fn service_start(name: String) -> Result<(), String> {
    service::control_service(&name, "start")
}

#[command]
fn service_stop(name: String) -> Result<(), String> {
    service::control_service(&name, "stop")
}

#[command]
fn service_restart(name: String) -> Result<(), String> {
    service::control_service(&name, "restart")
}

#[command]
fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    process::get_processes()
}

#[command]
fn end_process(pid: u32) -> Result<(), String> {
    process::end_process(pid)
}

#[command]
fn set_process_priority(pid: u32, priority: String) -> Result<(), String> {
    process::set_process_priority(pid, &priority)
}

#[command]
fn open_file_location(path: String) -> Result<(), String> {
    process::open_file_location(&path)
}

#[command]
fn get_network_connections() -> Result<Vec<NetworkConnection>, String> {
    network::get_network_connections()
}

#[command]
fn get_port_usage() -> Result<Vec<serde_json::Value>, String> {
    network::get_port_usage()
}

#[command]
fn get_dns_servers() -> Result<Vec<String>, String> {
    network::get_dns_servers()
}

#[command]
fn flush_dns() -> Result<String, String> {
    network::flush_dns()
}

#[command]
fn release_ip() -> Result<String, String> {
    network::release_ip()
}

#[command]
fn renew_ip() -> Result<String, String> {
    network::renew_ip()
}

#[command]
fn reset_network() -> Result<String, String> {
    network::reset_network()
}

#[command]
fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    disk::get_disk_info()
}

#[command]
fn cleanup_disk(drive: String) -> Result<String, String> {
    disk::cleanup_disk(&drive)
}

#[command]
fn check_disk(drive: String) -> Result<String, String> {
    disk::check_disk(&drive)
}

#[command]
fn get_startup_items() -> Result<Vec<serde_json::Value>, String> {
    system::get_startup_items()
}

#[command]
fn toggle_startup_item(name: String, enabled: bool) -> Result<(), String> {
    system::toggle_startup_item(&name, enabled)
}

#[command]
fn get_scheduled_tasks() -> Result<Vec<serde_json::Value>, String> {
    system::get_scheduled_tasks()
}

#[command]
fn run_scheduled_task(name: String) -> Result<(), String> {
    system::run_scheduled_task(&name)
}

#[command]
fn disable_scheduled_task(name: String) -> Result<(), String> {
    system::disable_scheduled_task(&name)
}

#[command]
fn clean_temp_files() -> Result<serde_json::Value, String> {
    system::clean_temp_files()
}

#[command]
fn clean_cache_files() -> Result<serde_json::Value, String> {
    system::clean_cache_files()
}

#[command]
fn optimize_performance() -> Result<(), String> {
    system::optimize_performance()
}

#[command]
fn get_env_variables() -> Result<Vec<serde_json::Value>, String> {
    system::get_env_variables()
}

#[command]
fn set_env_variable(name: String, value: String, scope: String) -> Result<(), String> {
    system::set_env_variable(&name, &value, &scope)
}

#[command]
fn delete_env_variable(name: String, scope: String) -> Result<(), String> {
    system::delete_env_variable(&name, &scope)
}

#[command]
fn get_hosts_entries() -> Result<Vec<serde_json::Value>, String> {
    system::get_hosts_entries()
}

#[command]
fn add_hosts_entry(ip: String, hostname: String) -> Result<(), String> {
    system::add_hosts_entry(&ip, &hostname)
}

#[command]
fn delete_hosts_entry(ip: String, hostname: String) -> Result<(), String> {
    system::delete_hosts_entry(&ip, &hostname)
}

#[command]
fn run_sfc_scan() -> Result<(), String> {
    system::run_sfc_scan()
}

#[command]
fn run_dism() -> Result<(), String> {
    system::run_dism()
}

#[command]
fn check_windows_update() -> Result<(), String> {
    system::check_windows_update()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting Windows Toolbox application");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            is_admin,
            restart_as_admin,
            execute_powershell,
            open_system_tool,
            get_registry_tree,
            get_registry_values,
            set_registry_value,
            create_registry_value,
            delete_registry_value,
            export_registry_key,
            get_registry_subkeys,
            get_services,
            service_start,
            service_stop,
            service_restart,
            get_processes,
            end_process,
            set_process_priority,
            open_file_location,
            get_network_connections,
            get_port_usage,
            get_dns_servers,
            flush_dns,
            release_ip,
            renew_ip,
            reset_network,
            get_disk_info,
            cleanup_disk,
            check_disk,
            get_startup_items,
            toggle_startup_item,
            get_scheduled_tasks,
            run_scheduled_task,
            disable_scheduled_task,
            clean_temp_files,
            clean_cache_files,
            optimize_performance,
            get_env_variables,
            set_env_variable,
            delete_env_variable,
            get_hosts_entries,
            add_hosts_entry,
            delete_hosts_entry,
            run_sfc_scan,
            run_dism,
            check_windows_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
