# Architecture

> 状态：稳定 (v2.x)
> 适用范围：`crates/wt-core`, `crates/wt-win32`, `crates/wt-service`,
> `crates/wt-agent`, `crates/wt-ui`, `ui/`

## 设计目标

1. **最小特权** — UI 与用户态代理永远不接触 Win32 管理员 API；
   所有特权操作经由唯一的 SYSTEM 服务代理
2. **进程边界清晰** — 三个可执行文件各自承担单一职责，IPC 协议显式定义
3. **可审计** — 任何写操作都通过 `tracing` JSON 落盘
4. **可测试** — FFI 包装层可替换为 mock；上层业务逻辑可单元测试
5. **失败安全** — 任何错误必须冒泡至 UI；不静默吞掉 panic

## 进程模型

```
                 ┌───────────────────────────────────┐
                 │  wt-ui.exe (Tauri 2 host)         │
                 │  ─ Vue 3.5 SPA inside WebView2    │
                 │  ─ 35 Tauri commands              │
                 └───────────────┬───────────────────┘
                                 │ Tauri IPC (in-process)
                                 ▼
                 ┌───────────────────────────────────┐
                 │  wt-agent.exe (user mode)         │
                 │  ─ JSON-RPC 2.0 over stdio        │
                 │  ─ HMAC-SHA256 session auth       │
                 │  ─ Win32 FFI via wt-win32         │
                 └───────────────┬───────────────────┘
                                 │ Named Pipe \\.\pipe\WindowsTools
                                 │ Length-prefixed, HMAC-tagged
                                 ▼
                 ┌───────────────────────────────────┐
                 │  wt-service.exe (SYSTEM)          │
                 │  ─ SCM-registered Windows service │
                 │  ─ Length-prefixed pipe protocol  │
                 │  ─ Privileged Win32 FFI           │
                 └───────────────────────────────────┘
```

## 关键决策

### 1. 为什么把 agent 拆出 wt-ui？

- 调试方便：可以单独跑 `wt-agent.exe serve` + 终端 JSON-RPC 客户端
- 进程隔离：UI 崩溃不会影响 IPC
- 未来多前端：CLI / Web 都可以复用 agent

### 2. 为什么用 stdio JSON-RPC 而非 localhost HTTP？

- 不暴露端口，没有防火墙 / TLS 复杂度
- 进程生命周期由 Tauri 自动管理
- 调试时可以直接 `cat input.json | wt-agent.exe serve`

### 3. 为什么用 Named Pipe 而非 TCP？

- Pipe 仅本机可访问
- 不需要端口号（避免冲突）
- Windows 原生 ACL（`PipeAccessRule`）可限制特定 SID

### 4. IPC 协议

`wt-agent` ↔ `wt-service`：

```
Frame = LE_u32(len) || body || HMAC-SHA256(session_key, len || body) (32 bytes)
```

`wt-ui` ↔ `wt-agent`：

```
Tauri command (in-process function call)  →  wt-agent  →  pipe frame
```

### 5. 命令清单

35 个 Tauri command 按职责分组：

| 分组 | Command |
|------|---------|
| 系统信息 | `ping`, `whoami`, `system_info`, `system_integrity`, `system_env`, `system_set_env` |
| 进程 | `processes_list`, `processes_kill` |
| 服务 | `services_list`, `services_config`, `services_start`, `services_stop`, `services_set_start_type` |
| 注册表 | `registry_get`, `registry_set`, `registry_delete_value`, `registry_delete_tree`, `registry_list_subkeys` |
| 网络 | `network_adapters`, `network_tcp_table`, `network_udp_table` |
| 磁盘 | `disk_drives`, `disk_free` |
| 启动项 | `startup_list`, `startup_enable`, `startup_disable` |
| 性能 | `performance_stream` |
| Hosts | `hosts_list`, `hosts_write` |
| 修复 | `repair_sfc`, `repair_dism` |
| 任务 | `task_list`, `task_run_now` |
| 启动 | `launch_run` |
| 调色板 | `palette_list_commands`, `palette_search` |

## 错误传播

```
wt-win32:    win32!() → winapi::Result<T>
wt-core:     AppError  (thiserror)
wt-service:  AppError  → serde::Serialize
wt-agent:    AppError  → JSON-RPC error object
wt-ui:       AppError  → invoke() rejection → Pinia store.error
Vue UI:      toast / inline error
```

## 性能采样

`wt-ui::commands::performance` 通过 `Arc<PerfHandle>` 后台线程
每 1s 调用一次 `wt_win32::perf::sample()`，把结果送入
`crossbeam_channel`，Tauri 端 `stream::spawn_periodic()` 把它
转换成 `Stream<Item = PerfSample>`，前端用 `EventTarget` 订阅。

## 主题切换

CSS 自定义属性 + `data-theme` attribute。`tokens.css` 定义
明 / 暗两套 token，`base.css` 引用。Pinia store 持久化选择到
`localStorage`，初始化时优先读取，缺失时回退到 `prefers-color-scheme`。

## 国际化

`vue-i18n@10` 单文件组件（SFC）`$t()` + 命名空间。
默认 `en`，运行时可在 `Settings` 切换 `zh-CN`。`Accept-Language`
检测在 `main.ts` 启动时一次性应用。
