export interface ManifestItem {
  id: string;
  title: string;
  title_zh: string;
  category: string;
  keywords: string[];
  risk: string;
  requires_admin: boolean;
  route: string;
}

export interface SystemInfo {
  computer_name: string;
  user_name: string;
  user_sid: string;
  major: number;
  minor: number;
  build: number;
  display: string;
  edition: string;
  uptime_seconds: number;
  pid: number;
  is_elevated: boolean;
}

export interface IntegrityInfo {
  integrity: string;
  label: string;
  elevated: boolean;
}

export interface ProcessRow {
  pid: number;
  name: string;
  parent_pid: number;
  threads: number;
  priority_class: number;
  working_set_bytes: number;
  private_bytes: number;
  user: string;
  path: string;
}

export interface ServiceRow {
  name: string;
  display: string;
  status: string;
  start_type: string;
  pid: number;
  can_stop: boolean;
  can_pause: boolean;
  description: string;
}

export interface VolumeRow {
  mount_point: string;
  label: string;
  fs: string;
  total_bytes: number;
  free_bytes: number;
  kind: string;
}

export interface HostsEntry {
  ip: string;
  hostname: string;
  comment?: string;
}

export interface TcpConnRow {
  local: string;
  remote: string;
  state: string;
  pid: number;
}

export interface UdpRow {
  local: string;
  pid: number;
}

export interface PerfSample {
  timestamp_ms: number;
  cpu_percent: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  disk_read_bytes_per_sec: number;
  disk_write_bytes_per_sec: number;
}

export interface StartupItem {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  source: string;
}

export interface ScheduledTaskRow {
  name: string;
  path: string;
  state: string;
  last_run: string;
  next_run: string;
  author: string;
  description: string;
}
