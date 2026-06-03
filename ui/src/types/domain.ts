export type Integrity =
  | 'Untrusted'
  | 'Low'
  | 'Medium'
  | 'MediumPlus'
  | 'High'
  | 'System'
  | 'Unknown';

export type ServiceStartType = 'boot' | 'system' | 'auto' | 'demand' | 'disabled';

export type ServiceStatus =
  | 'stopped'
  | 'start_pending'
  | 'stop_pending'
  | 'running'
  | 'continue_pending'
  | 'pause_pending'
  | 'paused';

export interface EnvVar {
  name: string;
  value: string;
  scope: 'User' | 'System' | 'Process';
}

export interface RegistryValue {
  name: string;
  kind: 'Sz' | 'ExpandSz' | 'Dword' | 'Qword' | 'Binary' | 'MultiSz' | string;
  data: unknown;
}

export type Source = 'hkcu_run' | 'hklm_run' | 'hkcu_run_once' | 'hklm_run_once' | 'startup_folder';
