import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: 'Dashboard', icon: '⊞' },
  },
  {
    path: '/processes',
    name: 'processes',
    component: () => import('@/views/Processes.vue'),
    meta: { title: 'Processes', icon: '⚙' },
  },
  {
    path: '/services',
    name: 'services',
    component: () => import('@/views/Services.vue'),
    meta: { title: 'Services', icon: '🔧' },
  },
  {
    path: '/registry',
    name: 'registry',
    component: () => import('@/views/Registry.vue'),
    meta: { title: 'Registry', icon: '📦' },
  },
  {
    path: '/network',
    name: 'network',
    component: () => import('@/views/Network.vue'),
    meta: { title: 'Network', icon: '🌐' },
  },
  {
    path: '/disk',
    name: 'disk',
    component: () => import('@/views/Disk.vue'),
    meta: { title: 'Disk', icon: '💾' },
  },
  {
    path: '/startup',
    name: 'startup',
    component: () => import('@/views/Startup.vue'),
    meta: { title: 'Startup', icon: '🚀' },
  },
  {
    path: '/performance',
    name: 'performance',
    component: () => import('@/views/Performance.vue'),
    meta: { title: 'Performance', icon: '📈' },
  },
  {
    path: '/hosts',
    name: 'hosts',
    component: () => import('@/views/Hosts.vue'),
    meta: { title: 'Hosts', icon: '📝' },
  },
  {
    path: '/repair',
    name: 'repair',
    component: () => import('@/views/Repair.vue'),
    meta: { title: 'Repair', icon: '🛠' },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/Tasks.vue'),
    meta: { title: 'Tasks', icon: '⏱' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: 'Settings', icon: '⚙' },
  },
  { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/NotFound.vue') },
];

export const router = createRouter({ history: createWebHashHistory(), routes });
