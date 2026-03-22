<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <el-button type="primary" @click="handleCreateTask">
            <el-icon><Plus /></el-icon>
            新建任务
          </el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务名称或网址"
          clearable
          style="width: 300px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <el-table :data="filteredTasks" stripe style="width: 100%; margin-top: 16px">
        <el-table-column prop="name" label="任务名称" min-width="150" />
        <el-table-column prop="url" label="目标网址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fields" label="字段数" width="80" align="center">
          <template #default="{ row }">
            {{ row.fields?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="success" link @click="handleRun(row)">
              <el-icon><VideoPlay /></el-icon>
              运行
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="filteredTasks.length === 0" description="暂无任务" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, Delete, VideoPlay } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import type { Task } from '@/types'

const router = useRouter()
const taskStore = useTaskStore()

const searchKeyword = ref('')

const filteredTasks = computed(() => {
  if (!searchKeyword.value) return taskStore.tasks
  const keyword = searchKeyword.value.toLowerCase()
  return taskStore.tasks.filter(t =>
    t.name.toLowerCase().includes(keyword) ||
    t.url.toLowerCase().includes(keyword)
  )
})

function statusType(status: string) {
  switch (status) {
    case 'idle': return 'info'
    case 'running': return 'warning'
    case 'completed': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
}

function statusText(status: string) {
  switch (status) {
    case 'idle': return '就绪'
    case 'running': return '运行中'
    case 'paused': return '已暂停'
    case 'completed': return '已完成'
    case 'error': return '出错'
    default: return '未知'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function handleCreateTask() {
  taskStore.setCurrentTask(taskStore.createNewTask())
  router.push('/')
}

function handleEdit(task: Task) {
  taskStore.setCurrentTask(task)
  router.push('/')
}

async function handleRun(task: Task) {
  taskStore.setCurrentTask(task)
  router.push('/')
  await nextTick()
}

async function handleDelete(task: Task) {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${task.name}"吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    taskStore.deleteTask(task.id)
    ElMessage.success('任务已删除')
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  taskStore.loadTasks()
})
</script>

<style scoped>
.task-list {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  padding: 0;
}
</style>
