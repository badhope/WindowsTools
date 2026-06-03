# WindowsTools 全面优化 — Design (2026-06-02)

## 背景
- 项目:Tauri 2 桌面应用 (Vue 3.5 + Vite 5 + TypeScript 5 + 5 个 Rust crate)
- 上轮遗留:build 跑不通 (`Os { code: 0, kind: Uncategorized }`);lint/format 没装;typecheck 不强;UI 是"够用"水平
- 用户原话:三个面(后端构建 / 前端工程化 / UI/UX)都干

## Phase 1 状态:已识别 + 归档(暂不实现)
**结论**:在当前 Windows sandbox 环境下,Tauri 2 桌面 app 真实构建跑不通。三次尝试记录:

1. **Rust 1.96 (stable)**:`Command::output()` 在 build script 中 panic,所有 proc-macro crate 编译失败(serde_core / quote / proc-macro2 / thiserror / zmij / num-traits / generic-array)
2. **Rust 1.80**:不支持 edition 2024(`getrandom v0.4.2` 需要 edition2024 feature)
3. **Rust 1.85**:rustup 装 6 个 components 时 `目录不是空的` (os error 145) 反复重试,30+ min 装不完

**根因**:Windows 11 24H2 sandbox + CodexSandbox 用户组(无 SeDebug/SeAssignPrimaryToken 特权)+ Rust 1.96 stdlib 的 `Command::output()` 在 stdio 继承场景下 `self.handles.take().unwrap()` 触发 panic。

**绕过方案**(给非 sandbox 机器):
- 改回 `channel = "stable"` (1.96) 即可直接 build
- 沙箱内:放权限 / zigbuild 静态链接 / docker 跨平台

**已固化配置**(为非 sandbox 机器准备好,本机不实际跑):
- `tauri.conf.json::additionalBrowserArgs = "--remote-debugging-port=9222 --remote-allow-origins=*"`
- `tauri.conf.json::beforeDevCommand / beforeBuildCommand / frontendDist` 改用绝对路径 .bat
- `crates/wt-ui/build.rs` 故意不调 `tauri_build::build()`,避免 rc.exe 触发同样的 panic
- `rust-toolchain.toml` channel 设为 `"1.85.0"`(本机 sandbox 暂不能跑)

**Phase 1 验收降级**:不验证 cargo 真实跑通,转用 `pnpm typecheck` + `pnpm build:strict` 验证前端 + tsc 解析(顺带能验证 35 个 invoke 名称跟 Rust 端一致)。

## Phase 2 — 前端工程化(立即开干)

2.1 装 eslint+prettier+vitest,加 config:
- `eslint.config.js`:vue3 + ts + a11y 推荐集,max-warnings=0
- `.prettierrc.json`:统一风格
- `vitest.config.ts`:jsdom 环境,alias 指向 `@/*`
- 修 `package.json`:`build` 默认改走 `build:strict`;`lint` 跑 `eslint .`;`format` 跑 `prettier --write`;新增 `test` 跑 `vitest run`

2.2 类型安全收紧:
- `tsconfig.json` 开 `noUncheckedIndexedAccess` + `noImplicitOverride` + `noFallthroughCasesInSwitch`
- `App.vue`、`stores/*`、`api/*` 现有 any/Record<string, unknown> 收敛到精确类型

2.3 单测覆盖:
- `api/index.ts` 35 个 invoke 包装 — 只测形状(类型 + 名字)
- 4 个 store:command(ui 状态)、ui(theme/locale)、system
- composables/useI18n
- 关键工具 utils/format

2.4 清理:
- 删桌面上的 15 个临时 log、2 个临时目录(`rust-test`, `dogfood-output` 旧版)
- 删 `crates/wt-ui/gen/`(build 产物)
- `crates/wt-ui/build.rs` 看看是否还有占位

### Phase 3 — UI/UX 打磨

3.1 主题 + 设计 token:
- `styles/tokens.css` 扩 12 个色阶(brand/neutral/success/warning/danger 各 50/100/.../900),data-theme 切换
- 加 dark mode toggle,默认跟随 OS

3.2 错误状态 + 空状态:
- `<EmptyState>`、`<ErrorState>`、`<LoadingState>` 三个通用组件,13 个 view 全部接入
- 错误展示统一:tone(severity)、建议操作(复制/重试/查看文档)

3.3 微动效:
- 路由切换 fade+slide(80ms)
- 列表 stagger(每项 30ms delay)
- 性能:用 `transition-group` + `will-change`

3.4 a11y:
- focus ring 系统色
- 键盘导航:Tab/Shift+Tab/Enter/Esc 全闭环
- aria-label 补全到所有 button/icon
- 色彩对比度 ≥ 4.5:1

3.5 命令面板升级:
- 模糊匹配 + 评分(替代当前 substring)
- 键盘快捷键 Ctrl+K(已支持)
- 最近使用(MRU)+ 收藏

## 不做
- 不动 tauri 2 之外的 GUI(React Native / Electron / etc)
- 不加新 IPC 命令(35 个够用,等真用上了再加)
- 不动 wt-service / wt-agent(用户没要求)

## 验收
- `pnpm tauri dev` 起来后,`agent-browser connect ws://127.0.0.1:9222` 能进
- 11 个 view 全部截图,console 0 error
- `pnpm typecheck` + `pnpm build:strict` + `pnpm lint` + `pnpm test` 全绿
- 桌面零临时文件
