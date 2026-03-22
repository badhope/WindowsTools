import { createRouter, createWebHistory } from 'vue-router'
import TaskConfig from '@/views/TaskConfig.vue'
import TaskList from '@/views/TaskList.vue'
import Templates from '@/views/Templates.vue'
import Settings from '@/views/Settings.vue'
import DataClean from '@/views/DataClean.vue'
import SelectorTester from '@/views/SelectorTester.vue'
import Screenshot from '@/views/Screenshot.vue'
import UrlAnalyzer from '@/views/UrlAnalyzer.vue'
import BrowserInfo from '@/views/BrowserInfo.vue'
import InterfaceAdapter from '@/views/InterfaceAdapter.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'TaskConfig',
      component: TaskConfig
    },
    {
      path: '/tasks',
      name: 'TaskList',
      component: TaskList
    },
    {
      path: '/templates',
      name: 'Templates',
      component: Templates
    },
    {
      path: '/settings',
      name: 'Settings',
      component: Settings
    },
    {
      path: '/clean',
      name: 'DataClean',
      component: DataClean
    },
    {
      path: '/selector',
      name: 'SelectorTester',
      component: SelectorTester
    },
    {
      path: '/screenshot',
      name: 'Screenshot',
      component: Screenshot
    },
    {
      path: '/analyzer',
      name: 'UrlAnalyzer',
      component: UrlAnalyzer
    },
    {
      path: '/browser',
      name: 'BrowserInfo',
      component: BrowserInfo
    },
    {
      path: '/adapter',
      name: 'InterfaceAdapter',
      component: InterfaceAdapter
    }
  ]
})

export default router
