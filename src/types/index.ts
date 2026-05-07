export interface MenuItem {
  id: string
  title: string
  icon: string
  path: string
  children?: MenuItem[]
}

export interface CommandResult {
  success: boolean
  output: string
  error: string
  exitCode: number
}

export interface RegistryKey {
  path: string
  name: string
  value: string | number | Buffer | null
  type: 'REG_SZ' | 'REG_DWORD' | 'REG_QWORD' | 'REG_BINARY' | 'REG_EXPAND_SZ' | 'REG_MULTI_SZ' | 'REG_NONE'
  children?: RegistryKey[]
}

export interface RegistryValue {
  name: string
  value_type: string
  value: string | number
}

export interface SystemService {
  name: string
  displayName: string
  status: 'Running' | 'Stopped' | 'Paused' | 'StartPending' | 'StopPending'
  startType: 'Automatic' | 'Manual' | 'Disabled'
  canStop: boolean
  canPause: boolean
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number
  path: string
  user: string
  priority: string
  threads?: number
  handles?: number
  startTime?: string
  runTime?: string
  commandLine?: string
}

export interface NetworkConnection {
  protocol: string
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: string
  pid: number
  processName: string
}

export interface DiskInfo {
  name: string
  totalSpace: number
  freeSpace: number
  usedSpace: number
  fileSystem: string
  driveType: 'Fixed' | 'Removable' | 'Network' | 'CDROM' | 'RAM'
}

export interface SystemInfo {
  osName: string
  osVersion: string
  osBuild: string
  computerName: string
  userName: string
  cpu: string
  ram: number
  architecture: string
}

export interface QuickAction {
  id: string
  name: string
  description: string
  icon: string
  command: string
  category: string
  requiresAdmin: boolean
}

export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh-CN' | 'en'
    autoStart: boolean
    minimizeToTray: boolean
    confirmDangerousActions: boolean
    showNotifications: boolean
    startMinimized: boolean
  }
  powershell: {
    defaultTimeout: number
    saveHistory: boolean
    maxHistoryItems: number
    executionPolicy: string
    outputFontSize: number
  }
  registry: {
    showHiddenKeys: boolean
    confirmDeletes: boolean
    autoRefresh: boolean
  }
  process: {
    autoRefresh: boolean
    refreshInterval: number
    showSystemProcesses: boolean
    highCpuThreshold: number
    highMemoryThreshold: number
  }
  data: {
    autoBackup: boolean
    backupInterval: string
  }
}

export interface NotificationItem {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface NetworkAdapter {
  name: string
  description: string
  macAddress: string
  status: string
  speed: number
  ipAddresses: string[]
  gateway: string
  dnsServers: string[]
}

export interface StartupItem {
  name: string
  command: string
  location: string
  enabled: boolean
  publisher: string
}
