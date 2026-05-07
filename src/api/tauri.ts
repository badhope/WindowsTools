import { invoke } from '@tauri-apps/api/core'
import type { SystemService, ProcessInfo, DiskInfo, NetworkConnection, NetworkAdapter, StartupItem, SystemInfo } from '@/types'
import { monitorApiCall } from '@/composables/usePerformance'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function apiCall<T>(command: string, args?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const data = await invoke<T>(command, args)
    return { success: true, data }
  } catch (error) {
    console.error(`API call "${command}" failed:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function getServices(): Promise<ApiResponse<SystemService[]>> {
  return monitorApiCall(() => apiCall<SystemService[]>('get_services'), 'get_services')
}

export async function serviceStart(name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('service_start', { name }), 'service_start')
}

export async function serviceStop(name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('service_stop', { name }), 'service_stop')
}

export async function serviceRestart(name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('service_restart', { name }), 'service_restart')
}

export async function getProcesses(): Promise<ApiResponse<ProcessInfo[]>> {
  return monitorApiCall(() => apiCall<ProcessInfo[]>('get_processes'), 'get_processes')
}

export async function endProcess(pid: number): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('end_process', { pid }), 'end_process')
}

export async function setProcessPriority(pid: number, priority: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('set_process_priority', { pid, priority }), 'set_process_priority')
}

export async function openFileLocation(path: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('open_file_location', { path }), 'open_file_location')
}

export async function getDiskInfo(): Promise<ApiResponse<DiskInfo[]>> {
  return monitorApiCall(() => apiCall<DiskInfo[]>('get_disk_info'), 'get_disk_info')
}

export async function cleanupDisk(drive: string): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('cleanup_disk', { drive }), 'cleanup_disk')
}

export async function checkDisk(drive: string): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('check_disk', { drive }), 'check_disk')
}

export async function getNetworkConnections(): Promise<ApiResponse<NetworkConnection[]>> {
  return monitorApiCall(() => apiCall<NetworkConnection[]>('get_network_connections'), 'get_network_connections')
}

export async function getPortUsage(port: number): Promise<ApiResponse<NetworkConnection[]>> {
  return monitorApiCall(() => apiCall<NetworkConnection[]>('get_port_usage', { port }), 'get_port_usage')
}

export async function getDnsServers(): Promise<ApiResponse<string[]>> {
  return monitorApiCall(() => apiCall<string[]>('get_dns_servers'), 'get_dns_servers')
}

export async function flushDns(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('flush_dns'), 'flush_dns')
}

export async function releaseIp(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('release_ip'), 'release_ip')
}

export async function renewIp(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('renew_ip'), 'renew_ip')
}

export async function resetNetwork(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('reset_network'), 'reset_network')
}

export async function getNetworkAdapters(): Promise<ApiResponse<NetworkAdapter[]>> {
  return monitorApiCall(() => apiCall<NetworkAdapter[]>('get_network_adapters'), 'get_network_adapters')
}

export async function getStartupItems(): Promise<ApiResponse<StartupItem[]>> {
  return monitorApiCall(() => apiCall<StartupItem[]>('get_startup_items'), 'get_startup_items')
}

export async function toggleStartupItem(name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('toggle_startup_item', { name }), 'toggle_startup_item')
}

export async function deleteStartupItem(name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('delete_startup_item', { name }), 'delete_startup_item')
}

export async function getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
  return monitorApiCall(() => apiCall<SystemInfo>('get_system_info'), 'get_system_info')
}

export async function optimizeSystem(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('optimize_system'), 'optimize_system')
}

export async function clearCache(): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('clear_cache'), 'clear_cache')
}

export async function getRegistryKeys(path: string): Promise<ApiResponse<Record<string, unknown>>> {
  return monitorApiCall(() => apiCall<Record<string, unknown>>('get_registry_keys', { path }), 'get_registry_keys')
}

export async function getRegistryValue(path: string, name: string): Promise<ApiResponse<unknown>> {
  return monitorApiCall(() => apiCall<unknown>('get_registry_value', { path, name }), 'get_registry_value')
}

export async function setRegistryValue(path: string, name: string, value: unknown, type: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('set_registry_value', { path, name, value, type }), 'set_registry_value')
}

export async function deleteRegistryKey(path: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('delete_registry_key', { path }), 'delete_registry_key')
}

export async function deleteRegistryValue(path: string, name: string): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('delete_registry_value', { path, name }), 'delete_registry_value')
}

export async function executePowershell(command: string): Promise<ApiResponse<string>> {
  return monitorApiCall(() => apiCall<string>('execute_powershell', { command }), 'execute_powershell')
}

export async function getLogs(): Promise<ApiResponse<string[]>> {
  return monitorApiCall(() => apiCall<string[]>('get_logs'), 'get_logs')
}

export async function clearLogs(): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('clear_logs'), 'clear_logs')
}

export async function isAdmin(): Promise<ApiResponse<boolean>> {
  return monitorApiCall(() => apiCall<boolean>('is_admin'), 'is_admin')
}

export async function restartAsAdmin(): Promise<ApiResponse<void>> {
  return monitorApiCall(() => apiCall<void>('restart_as_admin'), 'restart_as_admin')
}