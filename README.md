# 🛠️ WindowsTools - Windows 系统工具箱

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.1.0-blue.svg?style=for-the-badge)](https://github.com/badhope/WindowsTools)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?style=for-the-badge)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D.svg?style=for-the-badge)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-1.75+-DEA584.svg?style=for-the-badge)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?style=for-the-badge)](https://www.typescriptlang.org)

[![Stars](https://img.shields.io/github/stars/badhope/WindowsTools?style=social)](https://github.com/badhope/WindowsTools/stargazers)
[![Forks](https://img.shields.io/github/forks/badhope/WindowsTools?style=social)](https://github.com/badhope/WindowsTools/network/members)
[![Issues](https://img.shields.io/github/issues/badhope/WindowsTools)](https://github.com/badhope/WindowsTools/issues)
[![Downloads](https://img.shields.io/github/downloads/badhope/WindowsTools/total)](https://github.com/badhope/WindowsTools/releases)

**一款功能强大的 Windows 系统管理可视化工具** | [English](#english) | [简体中文](#简体中文)

</div>

---

## 📖 简介

WindowsTools 是一款面向 Windows 用户的专业系统管理工具，采用现代化的技术栈（Tauri 2.0 + Vue 3 + Rust）构建，提供流畅的用户体验和强大的系统管理能力。

### 🎯 核心特点

- 🚀 **轻量快速** - 基于 Tauri 构建，比 Electron 更小更快
- 🎨 **现代化界面** - Vue 3 + Element Plus，美观易用
- 💪 **功能丰富** - 50+ 系统管理功能，覆盖方方面面
- 🌐 **国际化** - 支持简体中文和 English
- 🔓 **完全开源** - MIT 许可证，完全透明
- ⚡ **实时响应** - 后端 Rust 高性能，前端响应流畅

---

## ✨ 功能特性

### 🖥️ 系统监控

| 功能 | 描述 |
|:-----|:-----|
| **仪表盘** | 系统信息概览、硬件状态、快速访问入口 |
| **进程管理** | 实时监控进程、CPU/内存排序、结束进程、调整优先级 |
| **服务管理** | 查看、启动、停止、重启 Windows 系统服务 |

### 🔧 系统工具

| 功能 | 描述 |
|:-----|:-----|
| **PowerShell 命令中心** | 可视化执行 PowerShell 命令、命令模板、历史记录 |
| **注册表管理器** | 可视化浏览、编辑、搜索、导出 Windows 注册表 |
| **网络工具** | 连接查看、端口占用分析、DNS 管理、IP 配置 |

### 💾 磁盘与优化

| 功能 | 描述 |
|:-----|:-----|
| **磁盘工具** | 空间分析、磁盘清理、健康检查 |
| **系统优化** | 启动项管理、计划任务、临时文件清理 |
| **快捷操作** | 一键打开常用系统工具（控制面板、设备管理器等） |

### ⚙️ 高级功能

| 功能 | 描述 |
|:-----|:-----|
| **环境变量编辑器** | 用户/系统环境变量管理 |
| **Hosts 文件编辑器** | 可视化编辑 Hosts 映射 |
| **系统修复** | SFC/DISM 系统文件修复工具 |
| **管理员权限** | 自动检测权限，一键以管理员身份重新启动 |

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 | 说明 |
|:----:|:--------:|:----:|
| ![Node.js](https://img.shields.io/badge/Node.js-≥18.0.0-339933?logo=node.js) | ≥ 18.0.0 | 前端运行环境 |
| ![Rust](https://img.shields.io/badge/Rust-≥1.75.0-DEA584?logo=rust) | ≥ 1.75.0 | Tauri 后端编译 |
| ![Windows](https://img.shields.io/badge/Windows-10/11-0078D6?logo=windows) | 10/11 | 操作系统 |
| Visual Studio Build Tools | 最新版 | Windows 原生编译 |
| WebView2 | 最新版 | 应用界面渲染 |

### 📥 安装方式

#### 方式一：下载发布版本（推荐）

前往 [Releases](https://github.com/badhope/WindowsTools/releases) 页面下载最新版本的安装包。

#### 方式二：从源码构建

**前提条件检查**：

```powershell
# 检查 Node.js
node --version  # 需要 >= 18.0.0

# 检查 Rust
rustc --version  # 需要 >= 1.75.0
cargo --version

# 如果没有 Rust，安装它
# 访问 https://rustup.rs 下载安装
```

**构建步骤**：

```bash
# 1. 克隆仓库
git clone https://github.com/badhope/WindowsTools.git
cd WindowsTools

# 2. 安装依赖
npm install

# 3. 开发模式运行（边开发边测试）
npm run tauri dev

# 4. 构建发布版本
npm run tauri build
```

#### 方式三：自动环境配置

项目提供了自动检测和安装依赖的脚本：

```bash
# 检测环境
npm run check:env

# 自动安装依赖
npm run setup
```

### 🖥️ 使用教程

#### 1. 首次启动

启动程序后，你会看到仪表盘页面，显示系统基本信息：
- 操作系统版本
- CPU 信息
- 内存使用情况
- 磁盘空间

#### 2. 进程管理

1. 点击左侧菜单的"进程管理"
2. 查看所有运行中的进程
3. 可以按 CPU 或内存使用量排序
4. 点击"结束进程"按钮终止进程
5. 点击"详情"查看进程详细信息

**管理员权限**：结束某些系统进程可能需要管理员权限，程序会自动提示。

#### 3. 服务管理

1. 点击左侧菜单的"服务管理"
2. 查看所有 Windows 服务
3. 选择服务，点击"启动"、"停止"或"重启"
4. 查看服务状态和启动类型

**注意**：修改服务状态需要管理员权限。

#### 4. 注册表管理

1. 点击左侧菜单的"注册表"
2. 浏览注册表树形结构
3. 选择键值进行查看和编辑
4. 支持导出注册表为 .reg 文件

**警告**：修改注册表可能影响系统稳定，请谨慎操作。

#### 5. 网络工具

1. 点击左侧菜单的"网络工具"
2. 查看当前网络连接
3. 查看端口占用情况
4. 使用"DNS刷新"、"IP释放/更新"等功能

**注意**：网络操作需要管理员权限。

#### 6. 系统优化

1. 点击左侧菜单的"系统优化"
2. 管理启动项（启用/禁用）
3. 查看和管理计划任务
4. 一键清理临时文件

#### 7. 高级工具

1. 点击左侧菜单的"高级工具"
2. 编辑环境变量
3. 编辑 Hosts 文件
4. 运行 SFC/DISM 系统修复

### 🔐 管理员权限

程序会自动检测当前是否为管理员身份。当需要管理员权限的操作被触发时：

1. 程序会弹出确认对话框
2. 点击"确定"以管理员身份重新启动程序
3. Windows 会显示 UAC 确认框
4. 确认后程序将以管理员权限运行

---

## 📦 项目结构

```
WindowsTools/
├── 📂 src/                      # 前端源码 (Vue 3)
│   ├── 📂 api/                 # API 调用封装
│   ├── 📂 components/           # 公共组件
│   ├── 📂 composables/         # Vue 组合式函数
│   ├── 📂 locales/             # 国际化语言包
│   ├── 📂 router/              # Vue Router 路由配置
│   ├── 📂 stores/              # Pinia 状态管理
│   ├── 📂 styles/              # 全局样式
│   ├── 📂 types/                # TypeScript 类型定义
│   └── 📂 views/               # 页面视图组件
│
├── 📂 src-tauri/               # Tauri 后端 (Rust)
│   ├── 📂 src/
│   │   ├── 📄 disk.rs         # 磁盘工具模块
│   │   ├── 📄 helpers.rs      # 辅助函数
│   │   ├── 📄 lib.rs          # 库入口和命令注册
│   │   ├── 📄 main.rs         # 程序入口
│   │   ├── 📄 network.rs      # 网络工具模块
│   │   ├── 📄 process.rs      # 进程管理模块
│   │   ├── 📄 registry.rs     # 注册表操作模块
│   │   ├── 📄 service.rs      # 服务管理模块
│   │   ├── 📄 system.rs       # 系统操作模块
│   │   └── 📄 utils.rs        # 工具函数
│   ├── 📄 Cargo.toml          # Rust 依赖配置
│   └── 📄 tauri.conf.json     # Tauri 配置
│
├── 📂 scripts/                  # 构建和安装脚本
├── 📂 .github/                  # GitHub 配置
│   ├── 📂 workflows/           # GitHub Actions 工作流
│   ├── 📂 ISSUE_TEMPLATE/      # Issue 模板
│   └── 📂 PULL_REQUEST_TEMPLATE/ # PR 模板
│
├── 📄 package.json             # Node.js 项目配置
├── 📄 vite.config.ts          # Vite 配置
├── 📄 tsconfig.json            # TypeScript 配置
└── 📄 README.md                # 项目文档
```

---

## 🛠️ 开发命令

```bash
# 开发
npm run dev              # 启动前端开发服务器
npm run tauri dev        # 启动 Tauri 开发模式（热重载）

# 构建
npm run build            # 构建前端静态文件
npm run tauri build      # 构建桌面应用安装包

# 代码质量
npm run lint             # ESLint 检查并修复
npm run lint:check       # 仅检查不修复
npm run format           # Prettier 格式化代码
npm run format:check      # 检查格式
npm run typecheck        # TypeScript 类型检查

# 测试
npm run test             # 运行测试
npm run test:run         # 单次运行测试

# 环境
npm run check:env        # 检测环境依赖
npm run setup            # 自动安装依赖
```

---

## 🧱 技术栈

### 前端

| 技术 | 版本 | 用途 |
|:-----|:----:|:-----|
| [Vue.js](https://vuejs.org) | 3.4+ | 渐进式 JavaScript 框架 |
| [TypeScript](https://www.typescriptlang.org) | 5.4+ | 类型安全的 JavaScript |
| [Element Plus](https://element-plus.org) | 2.6+ | Vue 3 UI 组件库 |
| [Pinia](https://pinia.vuejs.org) | 2.1+ | Vue 状态管理 |
| [Vue Router](https://router.vuejs.org) | 4.3+ | Vue 路由管理 |
| [Vue I18n](https://vue-i18n.intlify.dev) | 9.10+ | 国际化 |
| [Vite](https://vitejs.dev) | 5.1+ | 构建工具 |

### 后端

| 技术 | 版本 | 用途 |
|:-----|:----:|:-----|
| [Tauri](https://tauri.app) | 2.0 | 桌面应用框架 |
| [Rust](https://www.rust-lang.org) | 1.75+ | 系统编程语言 |
| [Windows API](https://docs.microsoft.com/windows/win32/api/) | - | Windows 系统调用 |

---

## 🤝 参与贡献

我们欢迎所有形式的贡献！

### 贡献方式

1. **报告问题** - 在 [Issues](https://github.com/badhope/WindowsTools/issues) 提交 Bug 报告或功能建议
2. **提交代码** - Fork 项目并提交 Pull Request
3. **完善文档** - 帮助改进文档和翻译
4. **分享项目** - 向他人推荐此项目

### 开发流程

```bash
# 1. Fork 并克隆
git clone https://github.com/YOUR_USERNAME/WindowsTools.git
cd WindowsTools

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 进行开发并测试
npm run tauri dev
npm run lint
npm run typecheck

# 4. 提交更改
git add .
git commit -m "feat: add your feature"

# 5. 推送并创建 PR
git push origin feature/your-feature
```

详细的贡献指南请查看 [CONTRIBUTING.md](.github/CONTRIBUTING.md)。

---

## 📜 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

### v1.1.0 更新内容

- ✨ 添加管理员权限自动检测和提升功能
- ✨ 新增 PowerShell 命令执行中心
- ✨ 增强进程管理功能
- ✨ 改进注册表编辑器
- 🐛 修复多个 Bug
- 📝 更新文档和贡献指南

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2024-2025 WindowsTools

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 致谢

感谢以下开源项目和贡献者：

- [Tauri](https://tauri.app) - 构建更小、更快、更安全的桌面应用
- [Vue.js](https://vuejs.org) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org) - Vue 3 UI 组件库
- [Rust](https://www.rust-lang.org) - 系统编程语言
- 所有为本项目做出贡献的开发者们

---

## 📞 联系与支持

- 🐛 [报告问题](https://github.com/badhope/WindowsTools/issues)
- 💡 [功能建议](https://github.com/badhope/WindowsTools/discussions)
- 📖 [项目文档](https://github.com/badhope/WindowsTools/wiki)

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！**

[![Star History Chart](https://api.star-history.com/svg?repos=badhope/WindowsTools&type=Date)](https://star-history.com/#badhope/WindowsTools&Date)

**Made with ❤️ by [badhope](https://github.com/badhope)**

</div>
