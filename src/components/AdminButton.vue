<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { checkAdminStatus, restartAsAdmin } from '@/composables/useAdmin'
import { Lock } from '@element-plus/icons-vue'
import type { ButtonProps } from 'element-plus'

const props = withDefaults(defineProps<{
  actionName: string
  disabled?: boolean
  loading?: boolean
  type?: ButtonProps['type']
  size?: ButtonProps['size']
  icon?: any
}>(), {
  type: 'primary',
  size: 'default',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const isAdmin = ref(false)
const isChecking = ref(true)

onMounted(async () => {
  isAdmin.value = await checkAdminStatus()
  isChecking.value = false
})

const buttonClass = computed(() => ({
  'admin-required': !isAdmin.value && !isChecking.value
}))

const handleClick = async () => {
  if (props.disabled || props.loading || isChecking.value) return

  if (isAdmin.value) {
    emit('click')
    return
  }

  const confirmResult = await window.confirm(
    `此操作需要管理员权限！\n\n操作: ${props.actionName}\n\n是否以管理员身份重新启动程序？\n\n注意：当前程序窗口将关闭，以管理员身份重新打开。`
  )

  if (confirmResult) {
    await restartAsAdmin()
  }
}
</script>

<template>
  <el-button
    :class="buttonClass"
    :type="type"
    :size="size"
    :disabled="disabled || isChecking"
    :loading="loading"
    @click="handleClick"
  >
    <template #icon>
      <component :is="icon" v-if="icon" />
      <Lock v-else-if="!isAdmin && !isChecking" />
    </template>
    <slot>
      {{ actionName }}
    </slot>
  </el-button>
</template>

<style scoped>
.admin-required {
  position: relative;
}

.admin-required::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f56c6c;
}
</style>
