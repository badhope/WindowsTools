# 🛠️ Windows工具箱

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Tauri-2.0-orange.svg" alt="Tauri">
  <img src="https://img.shields.io/badge/Vue-3.4-brightgreen.svg" alt="Vue">
  <img src="https://img.shields.io/badge/Rust-1.75+-orange.svg" alt="Rust">
</p>

> 一款面向Windows用户的系统管理可视化工具，将复杂的命令行操作、注册表编辑、系统设置等高级功能转化为直观的图形界面按钮操作。

---

## ✨ 功能特性

### 核心模块

| 模块 | 功能描述 |
|------|---------|
| 🖥️ **仪表盘** | 系统信息概览、快速访问入口 |
| 💻 **PowerShell命令** | 可视化执行命令、常用模板、历史记录 |
| 📁 **注册表管理** | 可视化浏览、编辑、导出注册表 |
| ⚙️ **服务管理** | 查看/启动/停止/重启Windows服务 |
| 📊 **进程管理** | 实时监控、CPU/内存排序、结束进程 |
| 🌐 **网络工具** | 连接查看、端口占用、DNS管理 |
| 💾 **磁盘工具** | 空间分析、磁盘清理、磁盘检查 |
| ⚡ **快捷操作** | 一键打开系统工具 |
| 📈 **系统优化** | 启动项、计划任务、临时文件清理 |
| 🔧 **高级工具** | 环境变量、Hosts、SFC/DISM修复 |

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 |
|-----|------|
| Node.js | ≥ 18.0.0 |
| Rust | ≥ 1.75.0 |
| Windows | 10/11 |

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/badhope/VisualSpider.git
cd VisualSpider

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建发布
npm run tauri build
```

---

## 📦 项目结构

```
windows-toolbox/
├── src/                    # 前端源码
│   ├── views/             # 页面视图
│   │   ├── Dashboard.vue  # 仪表盘
│   │   ├── PowerShell.vue # PowerShell命令
│   │   ├── Registry.vue   # 注册表管理
│   │   ├── Services.vue   # 服务管理
│   │   ├── Processes.vue  # 进程管理
│   │   ├── Network.vue    # 网络工具
│   │   ├── Disk.vue       # 磁盘工具
│   │   ├── QuickActions.vue # 快捷操作
│   │   ├── Optimization.vue # 系统优化
│   │   ├── Advanced.vue   # 高级工具
│   │   └── Settings.vue   # 设置
│   ├── stores/            # 状态管理
│   ├── locales/           # 国际化
│   └── components/        # 公共组件
├── src-tauri/             # Tauri后端
│   └── src/
│       ├── system.rs      # 系统操作
│       ├── registry.rs    # 注册表操作
│       ├── process.rs     # 进程管理
│       ├── service.rs     # 服务管理
│       ├── network.rs     # 网络工具
│       └── disk.rs        # 磁盘工具
└── PROJECT_PLAN.md        # 项目计划书
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|-----|------|
| 前端框架 | Vue 3 + TypeScript |
| UI组件 | Element Plus |
| 状态管理 | Pinia |
| 桌面框架 | Tauri 2.0 |
| 后端语言 | Rust |
| 系统调用 | Windows API |

---

## 📝 开发命令

```bash
npm run dev          # 启动前端开发服务器
npm run tauri dev    # 启动Tauri开发模式
npm run build        # 构建前端
npm run tauri build  # 构建桌面应用
npm run lint         # 代码检查
npm run typecheck    # 类型检查
```

---

## 📄 许可证

[MIT License](LICENSE)

---

<p align="center">
  <strong>Made with ❤️ by WindowsToolbox Team</strong>
</p>
