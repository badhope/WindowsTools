import { invoke } from '@tauri-apps/api/core';
import type { Channel } from '@tauri-apps/api/core';
import type {
  ManifestItem,
  SystemInfo,
  IntegrityInfo,
  ProcessRow,
  ServiceRow,
  VolumeRow,
  HostsEntry,
  TcpConnRow,
  UdpRow,
  PerfSample,
  StartupItem,
  ScheduledTaskRow,
} from '@/types/api';

const wrap = <T>(p: Promise<T>) => p;

export const api = {
  ping: () => wrap(invoke<{ pong: true; service: string }>('ping')),
  whoami: () => wrap(invoke<Record<string, unknown>>('whoami')),
  systemInfo: () => wrap(invoke<SystemInfo>('system_info')),
  integrity: () => wrap(invoke<IntegrityInfo>('system_integrity')),
  env: (name?: string) =>
    wrap(invoke<Record<string, string> | EnvVarLike[]>('system_env', { name: name ?? null })),
  setEnv: (args: { name: string; value: string; scope: 'user' | 'process' }) =>
    wrap(invoke<void>('system_set_env', { args })),

  processList: () => wrap(invoke<ProcessRow[]>('processes_list')),
  processKill: (args: { pid: number; tree?: boolean }) =>
    wrap(invoke<void>('processes_kill', { args })),

  serviceList: () => wrap(invoke<ServiceRow[]>('services_list')),
  serviceConfig: (name: string) => wrap(invoke<ServiceRow>('services_config', { name })),
  serviceStart: (name: string) => wrap(invoke<void>('services_start', { name })),
  serviceStop: (name: string) => wrap(invoke<void>('services_stop', { name })),
  serviceSetStartType: (args: { name: string; start_type: string }) =>
    wrap(invoke<void>('services_set_start_type', { args })),

  regGet: (path: string, name: string) => wrap(invoke<unknown>('registry_get', { path, name })),
  regSet: (args: { path: string; name: string; kind: string; data_b64: string }) =>
    wrap(invoke<void>('registry_set', { args })),
  regDelValue: (args: { path: string; name: string }) =>
    wrap(invoke<void>('registry_delete_value', { args })),
  regDelTree: (args: { path: string }) => wrap(invoke<void>('registry_delete_tree', { args })),
  regListSubkeys: (args: { path: string }) =>
    wrap(invoke<string[]>('registry_list_subkeys', { args })),

  netAdapters: () => wrap(invoke<unknown[]>('network_adapters')),
  netTcpTable: () => wrap(invoke<TcpConnRow[]>('network_tcp_table')),
  netUdpTable: () => wrap(invoke<UdpRow[]>('network_udp_table')),

  diskDrives: () => wrap(invoke<VolumeRow[]>('disk_drives')),
  diskFree: (path: string) => wrap(invoke<VolumeRow>('disk_free', { path })),

  startupList: () => wrap(invoke<StartupItem[]>('startup_list')),
  startupEnable: (args: { name: string; command: string; source: string }) =>
    wrap(invoke<void>('startup_enable', { args })),
  startupDisable: (args: { name: string; command: string; source: string }) =>
    wrap(invoke<void>('startup_disable', { args })),

  perfStream: (channel: Channel<PerfSample>) =>
    wrap(invoke<void>('performance_stream', { channel })),

  hostsList: () => wrap(invoke<HostsEntry[]>('hosts_list')),
  hostsWrite: (entries: HostsEntry[]) => wrap(invoke<void>('hosts_write', { entries })),

  sfc: () => wrap(invoke<unknown>('repair_sfc')),
  dism: () => wrap(invoke<unknown>('repair_dism')),

  launch: (args: { path: string; args?: string; runas?: boolean }) =>
    wrap(invoke<number>('launch_run', { args })),

  taskList: () => wrap(invoke<ScheduledTaskRow[]>('task_list')),
  taskRunNow: (args: { name: string }) => wrap(invoke<void>('task_run_now', { args })),

  paletteList: () => wrap(invoke<ManifestItem[]>('palette_list_commands')),
  paletteSearch: (q: string, limit = 20) =>
    wrap(invoke<ManifestItem[]>('palette_search', { args: { q, limit } })),
};

export interface EnvVarLike {
  name: string;
  value: string;
  scope: string;
}
