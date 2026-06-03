# WindowsTools

> 一个面向高级用户和系统管理员的 Windows 桌面工具集，把常见的运维 / 排障操作
> 收拢到统一的 Tauri 2 + Vue 3.5 GUI 中。

[![CI](https://img.shields.io/badge/CI-windows--latest-blue)](.github/workflows/ci.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blueviolet)](.github/workflows/codeql.yml)
[![Release](https://img.shields.io/badge/Release-MSI%20%7C%20NSIS-success)](.github/workflows/release.yml)
[![Rust](https://img.shields.io/badge/rust-1.96%2B-orange)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-FFC131)](https://tauri.app)

## ✨ 功能

| 分类 | 视图 | 主要能力 |
|------|------|----------|
| 仪表盘 | `Dashboard` | 主机名 / 操作系统 / 运行时间 / CPU / 内存 / 磁盘 / 一键刷新 |
| 进程 | `Processes` | 列出所有进程、PID、用户、CPU% / 内存，右键结束进程 |
| 服务 | `Services` | 枚举 SCM 服务、查看启动类型、启动 / 停止 / 修改启动类型 |
| 注册表 | `Registry` | 浏览子键、读取 / 写入 / 删除 `REG_SZ` / `REG_DWORD` / `REG_BINARY` |
| 网络 | `Network` | 列出网卡、TCP / UDP 连接表（IPv4 + IPv6） |
| 磁盘 | `Disk` | 枚举卷、读取空闲空间、健康度提示 |
| 启动项 | `Startup` | HKCU / HKLM Run、RunOnce 启动项启用 / 禁用 |
| 性能 | `Performance` | PDH 实时采样：CPU / 内存 / 磁盘 / 网络（含 SVG sparkline） |
| Hosts | `Hosts` | 可视化编辑 `C:\Windows\System32\drivers\etc\hosts` |
| 修复 | `Repair` | 一键 `sfc /scannow` 和 `DISM /Online /Cleanup-Image /RestoreHealth` |
| 计划任务 | `Tasks` | 列出任务计划程序中的任务，立即运行 |
| 设置 | `Settings` | 主题（明 / 暗）、语言（zh-CN / en）、关于 |
| 命令面板 | `Ctrl/⌘+K` | 35 条命令的快速搜索 / 启动 |

所有"高权限"操作（修改服务、写入注册表、Hosts、计划任务等）由 `wt-service`
（SYSTEM 模式 Named Pipe 服务）代理执行，由 `wt-agent`（用户态 JSON-RPC）作为
IPC 入口；传输层使用 HMAC-SHA256 防伪。

## 🏗️ 架构

```
┌─────────────────────────────┐
│  Tauri 2 + WebView2 (UI)    │   crates/wt-ui  (Vue 3.5 SPA)
│  wt-ui.exe                  │
└──────────┬──────────────────┘
           │ JSON-RPC over stdio
           ▼
┌─────────────────────────────┐
│  wt-agent.exe (user mode)   │   crates/wt-agent
│  ─ JSON-RPC server (stdio)  │
│  ─ HMAC-SHA256 auth         │
└──────────┬──────────────────┘
           │ Named Pipe + HMAC
           ▼
┌─────────────────────────────┐
│  wt-service.exe (SYSTEM)    │   crates/wt-service
│  ─ SCM registration         │
│  ─ Pipe server              │
└──────────┬──────────────────┘
           │ Win32 FFI
           ▼
┌─────────────────────────────┐
│  wt-win32 (FFI wrappers)    │   crates/wt-win32
│  ─ PDH / SCM / Registry     │
│  ─ Task Scheduler / Hosts  │
│  ─ Network / Disk / Process │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  wt-core (shared types)     │   crates/wt-core
│  ─ Error / IPC / Secrets    │
│  ─ Telemetry / Privileges   │
└─────────────────────────────┘
```

## 📦 仓库结构

```
WindowsTools/
├── crates/
│   ├── wt-core/        # 共享类型、错误、IPC 协议
│   ├── wt-win32/       # Win32 FFI（PDH、SCM、注册表、Hosts…）
│   ├── wt-service/     # SYSTEM 模式命名管道服务
│   ├── wt-agent/       # 用户态 JSON-RPC 代理
│   └── wt-ui/          # Tauri 2 主机（35 个 command）
├── ui/                 # Vue 3.5 + Vite 5 前端
│   ├── src/
│   │   ├── api/        # invoke 包装
│   │   ├── components/ # Sidebar / StatusBar / CommandPalette
│   │   ├── stores/     # Pinia 状态
│   │   ├── router/     # vue-router 4
│   │   ├── locales/    # 国际化
│   │   ├── views/      # 12 个页面 + 404
│   │   └── styles/     # CSS tokens
│   └── vite.config.ts
├── docs/               # 设计文档、实施计划
├── .github/
│   ├── workflows/      # CI / Release / CodeQL
│   └── ISSUE_TEMPLATE/
├── Cargo.toml          # 工作区根
├── rust-toolchain.toml
└── README.md
```

## 🚀 快速开始

### 前置要求

| 工具 | 版本 | 备注 |
|------|------|------|
| Rust | **stable (≥ 1.96)** | 由 `rust-toolchain.toml` 锁定 |
| Node.js | **≥ 20.x** | 推荐 20 LTS |
| pnpm | **≥ 9.x** | `corepack enable && corepack prepare pnpm@9 --activate` |
| WebView2 Runtime | Evergreen | Win11 预装；Win10 手动安装 |
| Visual Studio Build Tools | 2022 | C++ 工作负载 + Windows 11 SDK |
| NSIS（仅打包需要） | 3.x | Tauri 自动检测 |

### 构建

```powershell
# 1. 克隆
git clone https://github.com/badhope/WindowsTools
cd WindowsTools

# 2. 构建 Rust 工作区
cargo build --workspace

# 3. 安装前端依赖
cd ui
pnpm install
pnpm build
cd ..

# 4. 启动开发模式
cargo tauri dev --manifest-path crates/wt-ui/Cargo.toml
```

### 打包 MSI / NSIS

```powershell
cd crates/wt-ui
cargo tauri build
# 产物在 crates/wt-ui/target/release/bundle/{msi,nsis}/
```

### 安装 / 卸载 SYSTEM 服务（开发用）

```powershell
# 安装服务（需要管理员）
.\target\debug\wt-service.exe install

# 启动服务
.\target\debug\wt-service.exe start

# 卸载服务
.\target\debug\wt-service.exe uninstall
```

## 🧪 验证

```powershell
# 1. 代码风格
cargo fmt --all -- --check

# 2. Lint
cargo clippy --workspace --all-targets --locked -- -D warnings

# 3. 单元测试
cargo test --workspace --locked --no-fail-fast

# 4. 前端类型检查
cd ui && pnpm typecheck

# 5. 前端构建
pnpm build
```

## 🤝 贡献

阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解代码风格、commit 规范和
PR 流程。Bug 报告 / 功能请求请使用对应的
[Issue 模板](.github/ISSUE_TEMPLATE/)。

## 🛡️ 安全

发现安全漏洞请阅读 [SECURITY.md](SECURITY.md)，**不要**直接公开 Issue。

## 📝 许可

本项目以 [MIT 协议](LICENSE) 开源。
