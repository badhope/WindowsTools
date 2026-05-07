import { ref } from 'vue'
import { isAdmin, restartAsAdmin } from '@/api/tauri'

const isAdminRef = ref(false)
const checked = ref(false)

export async function checkAdminStatus(): Promise<boolean> {
  if (!checked.value) {
    const result = await isAdmin()
    isAdminRef.value = result.success && result.data === true
    checked.value = true
  }
  return isAdminRef.value
}

export async function useAdmin() {
  const isAdminStatus = ref(false)

  const refreshAdminStatus = async () => {
    const result = await isAdmin()
    isAdminStatus.value = result.success && result.data === true
    checked.value = true
  }

  const ensureAdmin = async <T>(
    action: () => Promise<T>,
    actionName: string
  ): Promise<T | null> => {
    const admin = await checkAdminStatus()
    
    if (admin) {
      return action()
    }

    const confirmResult = await window.confirm(
      `此操作需要管理员权限！\n\n操作: ${actionName}\n\n是否以管理员身份重新启动程序？\n\n注意：当前程序窗口将关闭，以管理员身份重新打开。`
    )

    if (confirmResult) {
      await restartAsAdmin()
      return null
    }

    return null
  }

  const wrapAdminAction = <T>(
    action: () => Promise<T>,
    actionName: string
  ) => {
    return async (): Promise<T | null> => {
      return ensureAdmin(action, actionName)
    }
  }

  return {
    isAdmin: isAdminStatus,
    isAdminRef,
    checkAdminStatus,
    refreshAdminStatus,
    ensureAdmin,
    wrapAdminAction,
    restartAsAdmin
  }
}

export const adminActions = {
  service: ['service_start', 'service_stop', 'service_restart'],
  process: ['end_process', 'set_process_priority'],
  registry: ['set_registry_value', 'create_registry_value', 'delete_registry_value', 'create_registry_key', 'delete_registry_key'],
  network: ['flush_dns', 'release_ip', 'renew_ip', 'reset_network', 'disable_adapter', 'enable_adapter'],
  disk: ['check_disk', 'defragment_disk'],
  system: ['toggle_startup_item', 'run_scheduled_task', 'disable_scheduled_task', 'set_env_variable', 'delete_env_variable', 'add_hosts_entry', 'delete_hosts_entry', 'run_sfc_scan', 'run_dism']
}
