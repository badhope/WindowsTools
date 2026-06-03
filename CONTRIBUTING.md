# Contributing to WindowsTools

感谢你愿意为 WindowsTools 贡献代码 / 文档 / 想法！本文件是给贡献者的工作指南。

## 🧭 工作流

1. Fork 仓库
2. 创建特性分支：`git checkout -b feat/<short-slug>`
3. 提交改动（请阅读下方 commit 规范）
4. 推送并打开 Pull Request
5. 等待 CI 与 code review

## 🛠️ 开发环境

- Windows 10 1809+ 或 Windows 11
- Rust stable（参见 `rust-toolchain.toml`）
- Node.js ≥ 20，pnpm ≥ 9
- Visual Studio 2022 Build Tools（C++ 工作负载 + Windows 11 SDK）
- WebView2 Runtime（Win11 自带；Win10 用户请安装
  [Evergreen WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)）

## ✍️ 编码规范

### Rust

- `cargo fmt --all` 必须在每次提交前运行
- `cargo clippy --workspace --all-targets --locked -- -D warnings` 必须通过
- 公共 API 使用 `pub` 注释 (`///`)，使用 `cargo doc --no-deps` 检查
- 错误：使用 `thiserror` 在 crate 边界定义错误类型，
  内部代码优先 `Result<T, E>` 而非 `unwrap() / expect()`
- 注释：解释 **为什么** 而非 **做什么**；避免在生产代码里留下 TODO

### TypeScript / Vue

- 严格模式 (`strict: true`)
- 组件名 `PascalCase.vue`，文件 `kebab-case`
- `<script setup lang="ts">` + Composition API
- 避免在模板里写内联函数和复杂表达式
- `pnpm typecheck` 与 `pnpm build` 都必须通过

### 提交信息（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type**：`feat` / `fix` / `refactor` / `perf` / `test` / `docs` / `build`
/ `ci` / `chore`

**scope**（可选）：`ui` / `agent` / `service` / `win32` / `core` / `tauri`
/ `docs` / `ci`

**示例**：

```
feat(agent): add HMAC-SHA256 authentication to named-pipe handshake

Previously the agent accepted any caller that could write to the pipe.
Now each request must carry a 32-byte HMAC tag derived from a
per-session secret.  This prevents non-elevated processes from issuing
service-mutating commands.
```

## 🧪 测试

| 层 | 命令 | 期望 |
|----|------|------|
| 单元 | `cargo test --workspace` | 100% 通过 |
| 静态 | `cargo clippy ... -D warnings` | 0 warning |
| 前端类型 | `pnpm typecheck` | 0 错误 |
| 前端构建 | `pnpm build` | 产物可加载 |

## 📐 架构原则

- **最小特权**：`wt-service` 是唯一 SYSTEM 进程；`wt-agent` 保持用户态
- **零拷贝 / 单所有权**：跨边界时用 `Arc<T>` 而不是克隆
- **可审计**：所有写操作（注册表 / Hosts / 服务）记录到 `tracing` JSON
- **失败可见**：错误冒泡到 UI；不要静默 `unwrap()`

## 🔀 Pull Request 流程

1. PR 标题遵循 Conventional Commits
2. PR 描述引用相关 issue（`Closes #123` / `Refs #456`）
3. 勾选 PR 模板中的所有自检项
4. 至少 1 名维护者 approve 才能合并
5. 合并使用 **Squash and merge**

## 📄 行为准则

请保持专业与尊重。滥用、骚扰或任何不当行为将导致被拒绝参与。
