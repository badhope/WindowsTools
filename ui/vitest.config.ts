import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,vue}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,vue}',
        'src/main.ts',
        'src/App.vue',
        'src/i18n/**',
        'src/env.d.ts',
        'src/views/**',
        'src/components/**',
        'src/router/**',
        'src/composables/**',
        'src/types/**',
        // re-export bar 文件无 runtime logic,不计入分母
        'src/stores/index.ts',
      ],
      thresholds: {
        // 重点保障核心 logic:api + stores + utils
        statements: 80,
        branches: 65,
        // api/index.ts 暴露 30+ 个薄 method,只测了代表性几个,functions 比例天然低
        functions: 40,
        lines: 80,
      },
    },
  },
});
