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

/* ---------------------------------------------------------------- *
 *  Runtime detection
 * ---------------------------------------------------------------- */

/**
 * True when the page is running inside a Tauri 2 webview.  Tauri 2
 * injects `__TAURI_INTERNALS__` on the global; older Tauri 1 used
 * `__TAURI__`.  In a normal browser (e.g. `vite preview`) neither is
 * present and the API falls back to a deterministic mock so the UI
 * can still be demoed / dogfooded without Rust running.
 */
export function inTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

/* ---------------------------------------------------------------- *
 *  Mock backend (used only when `!inTauri()`)
 * ---------------------------------------------------------------- */

const mockSystemInfo: SystemInfo = {
  computer_name: 'WEB-DEMO',
  user_name: 'demo',
  user_sid: 'S-1-5-21-web-demo',
  major: 10,
  minor: 0,
  build: 22631,
  display: 'Web Demo (mock)',
  edition: 'Mock',
  uptime_seconds: 3672,
  pid: 1,
  is_elevated: false,
};

const mockIntegrity: IntegrityInfo = {
  integrity: 'Medium',
  label: 'Medium (mock)',
  elevated: false,
};

const mockProcesses: ProcessRow[] = [
  {
    pid: 4,
    name: 'System',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 0,
    threads: 120,
    priority_class: 32,
    working_set_bytes: 0,
    private_bytes: 0,
    path: 'System',
  },
  {
    pid: 388,
    name: 'smss.exe',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 4,
    threads: 4,
    priority_class: 11,
    working_set_bytes: 1_572_864,
    private_bytes: 524_288,
    path: 'C:\\Windows\\System32\\smss.exe',
  },
  {
    pid: 504,
    name: 'csrss.exe',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 388,
    threads: 13,
    priority_class: 13,
    working_set_bytes: 5_242_880,
    private_bytes: 4_194_304,
    path: 'C:\\Windows\\System32\\csrss.exe',
  },
  {
    pid: 580,
    name: 'wininit.exe',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 388,
    threads: 1,
    priority_class: 13,
    working_set_bytes: 6_291_456,
    private_bytes: 4_194_304,
    path: 'C:\\Windows\\System32\\wininit.exe',
  },
  {
    pid: 720,
    name: 'services.exe',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 580,
    threads: 7,
    priority_class: 9,
    working_set_bytes: 9_437_184,
    private_bytes: 6_291_456,
    path: 'C:\\Windows\\System32\\services.exe',
  },
  {
    pid: 732,
    name: 'svchost.exe',
    user: 'NT AUTHORITY\\SYSTEM',
    parent_pid: 720,
    threads: 30,
    priority_class: 8,
    working_set_bytes: 32_505_856,
    private_bytes: 18_874_368,
    path: 'C:\\Windows\\System32\\svchost.exe',
  },
  {
    pid: 1092,
    name: 'explorer.exe',
    user: 'DEMO\\demo',
    parent_pid: 0,
    threads: 80,
    priority_class: 8,
    working_set_bytes: 145_227_776,
    private_bytes: 110_100_480,
    path: 'C:\\Windows\\explorer.exe',
  },
  {
    pid: 2340,
    name: 'Windowstools.exe',
    user: 'DEMO\\demo',
    parent_pid: 1092,
    threads: 32,
    priority_class: 8,
    working_set_bytes: 195_035_136,
    private_bytes: 152_043_520,
    path: 'C:\\Program Files\\WindowsTools\\Windowstools.exe',
  },
  {
    pid: 4500,
    name: 'powershell.exe',
    user: 'DEMO\\demo',
    parent_pid: 1092,
    threads: 14,
    priority_class: 8,
    working_set_bytes: 78_583_808,
    private_bytes: 62_914_560,
    path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  },
  {
    pid: 4800,
    name: 'msedge.exe',
    user: 'DEMO\\demo',
    parent_pid: 1092,
    threads: 24,
    priority_class: 8,
    working_set_bytes: 318_767_104,
    private_bytes: 245_366_784,
    path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  },
  {
    pid: 4812,
    name: 'msedge.exe',
    user: 'DEMO\\demo',
    parent_pid: 4800,
    threads: 16,
    priority_class: 8,
    working_set_bytes: 87_654_912,
    private_bytes: 67_108_864,
    path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  },
  {
    pid: 5012,
    name: 'Code.exe',
    user: 'DEMO\\demo',
    parent_pid: 1092,
    threads: 41,
    priority_class: 8,
    working_set_bytes: 256_901_120,
    private_bytes: 201_326_592,
    path: 'C:\\Users\\demo\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
  },
];

const mockServices: ServiceRow[] = [
  {
    name: 'BITS',
    display: 'Background Intelligent Transfer Service',
    status: 'Running',
    start_type: 'Manual',
    pid: 3200,
    can_stop: true,
    can_pause: false,
    description: 'Transfers files between clients and servers using background bandwidth.',
  },
  {
    name: 'Spooler',
    display: 'Print Spooler',
    status: 'Running',
    start_type: 'Automatic',
    pid: 1820,
    can_stop: true,
    can_pause: true,
    description: 'Manages print jobs sent to the printer.',
  },
  {
    name: 'WinDefend',
    display: 'Windows Defender Service',
    status: 'Running',
    start_type: 'Automatic',
    pid: 2100,
    can_stop: false,
    can_pause: false,
    description: 'Protection against malware and other potentially unwanted software.',
  },
  {
    name: 'wuauserv',
    display: 'Windows Update',
    status: 'Stopped',
    start_type: 'Manual',
    pid: 0,
    can_stop: true,
    can_pause: false,
    description: 'Enables detection, download, and installation of updates.',
  },
  {
    name: 'RpcSs',
    display: 'Remote Procedure Call (RPC)',
    status: 'Running',
    start_type: 'Automatic',
    pid: 800,
    can_stop: false,
    can_pause: false,
    description: 'Service control manager for COM and DCOM servers.',
  },
  {
    name: 'Dnscache',
    display: 'DNS Client',
    status: 'Running',
    start_type: 'Automatic',
    pid: 1500,
    can_stop: true,
    can_pause: false,
    description: 'Resolves and caches DNS names for client computers.',
  },
];

const mockVolumes: VolumeRow[] = [
  {
    mount_point: 'C:\\',
    label: 'System',
    fs: 'NTFS',
    total_bytes: 512_105_932_800,
    free_bytes: 198_437_892_096,
    kind: 'fixed',
  },
  {
    mount_point: 'D:\\',
    label: 'Data',
    fs: 'NTFS',
    total_bytes: 1_024_211_962_368,
    free_bytes: 633_148_477_440,
    kind: 'fixed',
  },
];

const mockTcp: TcpConnRow[] = [
  { local: '192.168.1.10:51914', remote: '140.82.112.3:443', state: 'ESTABLISHED', pid: 4800 },
  { local: '127.0.0.1:9222', remote: '127.0.0.1:52301', state: 'ESTABLISHED', pid: 2340 },
  { local: '0.0.0.0:135', remote: '0.0.0.0:0', state: 'LISTENING', pid: 800 },
];

const mockUdp: UdpRow[] = [
  { local: '0.0.0.0:5353', pid: 1064 },
  { local: '0.0.0.0:5355', pid: 1064 },
  { local: '192.168.1.10:5353', pid: 1064 },
  { local: '127.0.0.1:64362', pid: 4500 },
];

const mockStartup: StartupItem[] = [
  {
    name: 'OneDrive',
    command: '"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background',
    location: 'HKCU',
    source: 'HKCU\\...\\Run',
    enabled: true,
  },
  {
    name: 'Docker Desktop',
    command: '"C:\\Program Files\\Docker\\Docker Desktop.exe"',
    location: 'HKCU',
    source: 'HKCU\\...\\Run',
    enabled: true,
  },
  {
    name: 'Spotify',
    command: '"C:\\Users\\demo\\AppData\\Roaming\\Spotify\\Spotify.exe"',
    location: 'HKLM',
    source: 'HKLM\\...\\Run',
    enabled: false,
  },
];

const mockHosts: HostsEntry[] = [
  { ip: '127.0.0.1', hostname: 'localhost' },
  { ip: '::1', hostname: 'localhost' },
  { ip: '255.255.255.255', hostname: 'broadcasthost' },
];

const mockTasks: ScheduledTaskRow[] = [
  {
    name: 'ScheduledDefrag',
    path: '\\Microsoft\\Windows\\Defrag\\ScheduledDefrag',
    state: 'Ready',
    last_run: '2026-05-31T03:00:00Z',
    next_run: '2026-06-07T03:00:00Z',
    author: 'Microsoft Corporation',
    description: 'Defragments the system drive',
  },
  {
    name: 'Scheduled Start',
    path: '\\Microsoft\\Windows\\WindowsUpdate\\Scheduled Start',
    state: 'Ready',
    last_run: '2026-06-02T15:00:00Z',
    next_run: '2026-06-09T15:00:00Z',
    author: 'Microsoft Corporation',
    description: 'Wakes the system to perform scheduled tasks',
  },
];

/** Route mock invokes to canned data; everything else resolves to undefined. */
function mockInvoke<T>(cmd: string, _args?: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case 'ping':
      return Promise.resolve({ pong: true, service: 'mock' } as unknown as T);
    case 'whoami':
      return Promise.resolve({ name: 'demo' } as unknown as T);
    case 'system_info':
      return Promise.resolve(mockSystemInfo as unknown as T);
    case 'system_integrity':
      return Promise.resolve(mockIntegrity as unknown as T);
    case 'system_env':
      return Promise.resolve([
        { name: 'PATH', value: '/usr/bin', scope: 'process' },
      ] as unknown as T);
    case 'processes_list':
      return Promise.resolve(mockProcesses as unknown as T);
    case 'services_list':
      return Promise.resolve(mockServices as unknown as T);
    case 'disk_drives':
      return Promise.resolve(mockVolumes as unknown as T);
    case 'disk_free':
      return Promise.resolve(mockVolumes[0] as unknown as T);
    case 'network_tcp_table':
      return Promise.resolve(mockTcp as unknown as T);
    case 'network_udp_table':
      return Promise.resolve(mockUdp as unknown as T);
    case 'startup_list':
      return Promise.resolve(mockStartup as unknown as T);
    case 'hosts_list':
      return Promise.resolve(mockHosts as unknown as T);
    case 'task_list':
      return Promise.resolve(mockTasks as unknown as T);
    case 'palette_list_commands':
    case 'palette_search':
      return Promise.resolve([] as unknown as T);
    default:
      return Promise.resolve(undefined as unknown as T);
  }
}

const call = <T>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  inTauri() ? invoke<T>(cmd, args) : mockInvoke<T>(cmd, args);

const wrap = <T>(p: Promise<T>) => p;

export interface EnvVarLike {
  name: string;
  value: string;
  scope: string;
}

export const api = {
  ping: () => wrap(call<{ pong: true; service: string }>('ping')),
  whoami: () => wrap(call<Record<string, unknown>>('whoami')),
  systemInfo: () => wrap(call<SystemInfo>('system_info')),
  integrity: () => wrap(call<IntegrityInfo>('system_integrity')),
  env: (name?: string) =>
    wrap(call<Record<string, string> | EnvVarLike[]>('system_env', { name: name ?? null })),
  setEnv: (args: { name: string; value: string; scope: 'user' | 'process' }) =>
    wrap(call<void>('system_set_env', { args })),

  processList: () => wrap(call<ProcessRow[]>('processes_list')),
  processKill: (args: { pid: number; tree?: boolean }) =>
    wrap(call<void>('processes_kill', { args })),

  serviceList: () => wrap(call<ServiceRow[]>('services_list')),
  serviceConfig: (name: string) => wrap(call<ServiceRow>('services_config', { name })),
  serviceStart: (name: string) => wrap(call<void>('services_start', { name })),
  serviceStop: (name: string) => wrap(call<void>('services_stop', { name })),
  serviceSetStartType: (args: { name: string; start_type: string }) =>
    wrap(call<void>('services_set_start_type', { args })),

  regGet: (path: string, name: string) => wrap(call<unknown>('registry_get', { path, name })),
  regSet: (args: { path: string; name: string; kind: string; data_b64: string }) =>
    wrap(call<void>('registry_set', { args })),
  regDelValue: (args: { path: string; name: string }) =>
    wrap(call<void>('registry_delete_value', { args })),
  regDelTree: (args: { path: string }) => wrap(call<void>('registry_delete_tree', { args })),
  regListSubkeys: (args: { path: string }) =>
    wrap(call<string[]>('registry_list_subkeys', { args })),

  netAdapters: () => wrap(call<unknown[]>('network_adapters')),
  netTcpTable: () => wrap(call<TcpConnRow[]>('network_tcp_table')),
  netUdpTable: () => wrap(call<UdpRow[]>('network_udp_table')),

  diskDrives: () => wrap(call<VolumeRow[]>('disk_drives')),
  diskFree: (path: string) => wrap(call<VolumeRow>('disk_free', { path })),

  startupList: () => wrap(call<StartupItem[]>('startup_list')),
  startupEnable: (args: { name: string; command: string; source: string }) =>
    wrap(call<void>('startup_enable', { args })),
  startupDisable: (args: { name: string; command: string; source: string }) =>
    wrap(call<void>('startup_disable', { args })),

  perfStream: (channel: Channel<PerfSample>) => wrap(call<void>('performance_stream', { channel })),

  hostsList: () => wrap(call<HostsEntry[]>('hosts_list')),
  hostsWrite: (entries: HostsEntry[]) => wrap(call<void>('hosts_write', { entries })),

  sfc: () => wrap(call<unknown>('repair_sfc')),
  dism: () => wrap(call<unknown>('repair_dism')),

  launch: (args: { path: string; args?: string; runas?: boolean }) =>
    wrap(call<number>('launch_run', { args })),

  taskList: () => wrap(call<ScheduledTaskRow[]>('task_list')),
  taskRunNow: (args: { name: string }) => wrap(call<void>('task_run_now', { args })),

  paletteList: () => wrap(call<ManifestItem[]>('palette_list_commands')),
  paletteSearch: (q: string, limit = 20) =>
    wrap(call<ManifestItem[]>('palette_search', { args: { q, limit } })),
};

// Re-export the Channel type so existing call-sites keep importing it
// from this module.
export type { Channel };
