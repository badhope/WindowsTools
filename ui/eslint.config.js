import vueParser from 'vue-eslint-parser';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueTsConfig from '@vue/eslint-config-typescript';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'src/env.d.ts',
      'src/i18n/**',
    ],
  },
  ...vue.configs['flat/recommended'],
  ...vueTsConfig(),
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      // 类型严格(由 tsconfig 控)之外的工程性约束
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // 改用 TS 版
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/define-macros-order': [
        'error',
        { order: ['defineProps', 'defineEmits', 'defineSlots', 'defineExpose'] },
      ],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],

      // === 与 Prettier 冲突的 vue 格式化规则交给 prettier 处理 ===
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/mustache-interpolation-spacing': 'off',
      'vue/no-multi-spaces': 'off',
      'vue/v-on-event-hyphenation': 'off',
      'vue/attribute-hyphenation': 'off',
    },
  },
  {
    files: ['**/*.test.ts', 'src/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);
