# WindowsTools

<div align="center">

**A powerful Windows System Administration Toolkit**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![Vue.js](https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-1.75+-DEA584?style=flat-square&logo=rust)](https://www.rust-lang.org)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Building from Source](#building-from-source)
- [Usage Guide](#usage-guide)
  - [Dashboard](#dashboard)
  - [Process Management](#process-management)
  - [Service Management](#service-management)
  - [Registry Editor](#registry-editor)
  - [Network Tools](#network-tools)
  - [Disk Management](#disk-management)
  - [System Optimization](#system-optimization)
  - [Advanced Tools](#advanced-tools)
- [Administrator Privileges](#administrator-privileges)
- [Project Structure](#project-structure)
- [Development](#development)
  - [Technology Stack](#technology-stack)
  - [Development Commands](#development-commands)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## About

WindowsTools is a professional Windows system administration toolkit built with modern technologies (Tauri 2.0 + Vue 3 + Rust). It provides a smooth user experience with powerful system management capabilities.

### Key Features

- **Lightweight & Fast** - Built with Tauri, smaller and faster than Electron
- **Modern UI** - Vue 3 + Element Plus, beautiful and user-friendly
- **Feature-Rich** - 50+ system management functions
- **Internationalized** - Supports English and Simplified Chinese
- **Open Source** - MIT License, fully transparent
- **Real-time Response** - High-performance Rust backend, smooth frontend

---

## Features

### System Monitoring

| Feature | Description |
|---------|-------------|
| **Dashboard** | System overview, hardware status, quick access |
| **Process Management** | Real-time process monitoring, CPU/Memory sorting, end processes, adjust priority |
| **Service Management** | View, start, stop, restart Windows services |

### System Tools

| Feature | Description |
|---------|-------------|
| **PowerShell Center** | Visual PowerShell command execution, templates, history |
| **Registry Editor** | Visual registry browsing, editing, searching, exporting |
| **Network Tools** | Connection viewing, port usage analysis, DNS management, IP configuration |

### Disk & Optimization

| Feature | Description |
|---------|-------------|
| **Disk Tools** | Space analysis, disk cleanup, health check |
| **System Optimization** | Startup item management, scheduled tasks, temp file cleanup |
| **Quick Actions** | One-click access to common system tools |

### Advanced Features

| Feature | Description |
|---------|-------------|
| **Environment Variables** | User/System environment variable management |
| **Hosts File Editor** | Visual Hosts file mapping editor |
| **System Repair** | SFC/DISM system file repair tools |
| **Admin Privileges** | Auto-detect permissions, restart as administrator |

---

## Screenshots

*Dashboard View*
```
┌─────────────────────────────────────────────────────────┐
│  🖥️ WindowsTools           [Dashboard] [Settings]     │
├─────────────┬───────────────────────────────────────────┤
│             │  System Information                       │
│  📊 Dashboard│  ─────────────────────                   │
│             │  OS: Windows 11 Pro                      │
│  📈 Processes│  CPU: Intel Core i7-12700K              │
│  ⚙️ Services │  Memory: 32.0 GB DDR5                  │
│             │  Disk: 1.0 TB NVMe SSD                   │
│  🔧 Registry │                                           │
│  🌐 Network  │  Performance                            │
│  💾 Disk     │  ─────────────────────                   │
│  🚀 Optimize │  CPU: ████████░░ 78%                   │
│  ⚡ Advanced │  Memory: ██████░░░░ 62%                │
│             │  Disk: ███░░░░░░░ 34%                   │
│  ⚙️ Settings │                                           │
│             │  [Quick Actions]                         │
└─────────────┴───────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Dependency | Version | Description |
|:-----------|:-------:|:------------|
| **Node.js** | ≥ 18.0.0 | Frontend runtime |
| **Rust** | ≥ 1.75.0 | Tauri backend compilation |
| **Windows** | 10/11 | Operating system |
| **Visual Studio Build Tools** | Latest | Windows native compilation |
| **WebView2** | Latest | Application rendering |

### Installation

#### Option 1: Download Release (Recommended)

Go to the [Releases](https://github.com/badhope/WindowsTools/releases) page and download the latest installer.

#### Option 2: Build from Source

**Prerequisite Check:**

```powershell
# Check Node.js
node --version  # Should be >= 18.0.0

# Check Rust
rustc --version  # Should be >= 1.75.0
cargo --version

# If Rust is not installed, get it from https://rustup.rs
```

**Build Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/badhope/WindowsTools.git
cd WindowsTools

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run tauri dev

# 4. Build release version
npm run tauri build
```

---

## Usage Guide

### Dashboard

The dashboard provides a quick overview of your system:

- **System Information**: OS version, CPU, memory, disk space
- **Performance Monitor**: Real-time CPU and memory usage charts
- **Quick Actions**: Common system tools shortcuts

### Process Management

1. Click **"Process Management"** in the sidebar
2. View all running processes
3. Sort by **CPU** or **Memory** usage
4. Click **"End Process"** to terminate a process
5. Click **"Details"** to view process information

**Note**: Ending some system processes requires administrator privileges.

### Service Management

1. Click **"Service Management"** in the sidebar
2. View all Windows services
3. Select a service and click **"Start"**, **"Stop"**, or **"Restart"**
4. View service status and startup type

**Note**: Modifying service status requires administrator privileges.

### Registry Editor

1. Click **"Registry"** in the sidebar
2. Browse the registry tree structure
3. Select keys/values to view and edit
4. Export registry to `.reg` files

**Warning**: Modifying the registry may affect system stability. Proceed with caution.

### Network Tools

1. Click **"Network Tools"** in the sidebar
2. View current network connections
3. View port usage
4. Use **"Flush DNS"**, **"Release IP"**, **"Renew IP"** functions

**Note**: Network operations require administrator privileges.

### Disk Management

1. Click **"Disk Management"** in the sidebar
2. View all disks and partitions
3. Click **"Cleanup"** to clean up disk space
4. Click **"Check"** to run disk health check

### System Optimization

1. Click **"System Optimization"** in the sidebar
2. Manage startup items (Enable/Disable)
3. View and manage scheduled tasks
4. One-click temp file cleanup

### Advanced Tools

1. Click **"Advanced Tools"** in the sidebar
2. Edit environment variables
3. Edit Hosts file
4. Run SFC/DISM system repair

---

## Administrator Privileges

The application automatically detects if it's running with administrator privileges.

When an operation requiring admin privileges is triggered:

1. A confirmation dialog appears
2. Click **"OK"** to restart as administrator
3. Windows will show a UAC confirmation prompt
4. After confirmation, the app runs with admin privileges

---

## Project Structure

```
WindowsTools/
├── 📂 src/                      # Frontend source (Vue 3)
│   ├── 📂 api/                 # API calls
│   ├── 📂 components/           # Shared components
│   ├── 📂 composables/         # Vue composables
│   ├── 📂 locales/             # i18n language files
│   ├── 📂 router/              # Vue Router config
│   ├── 📂 stores/              # Pinia state management
│   ├── 📂 styles/              # Global styles
│   ├── 📂 types/                # TypeScript types
│   └── 📂 views/               # Page components
│
├── 📂 src-tauri/               # Tauri backend (Rust)
│   ├── 📂 src/
│   │   ├── 📄 disk.rs         # Disk tools module
│   │   ├── 📄 helpers.rs      # Helper functions
│   │   ├── 📄 lib.rs          # Library entry
│   │   ├── 📄 main.rs         # Application entry
│   │   ├── 📄 network.rs      # Network tools module
│   │   ├── 📄 process.rs      # Process management module
│   │   ├── 📄 registry.rs     # Registry operations module
│   │   ├── 📄 service.rs      # Service management module
│   │   ├── 📄 system.rs       # System operations module
│   │   └── 📄 utils.rs        # Utilities
│   ├── 📄 Cargo.toml          # Rust dependencies
│   └── 📄 tauri.conf.json     # Tauri configuration
│
├── 📂 scripts/                  # Build and install scripts
├── 📂 .github/                  # GitHub configuration
│   ├── 📂 ISSUE_TEMPLATE/      # Issue templates
│   └── 📂 PULL_REQUEST_TEMPLATE/ # PR templates
│
├── 📄 package.json             # Node.js config
├── 📄 vite.config.ts          # Vite configuration
├── 📄 tsconfig.json            # TypeScript config
└── 📄 README.md                # Documentation
```

---

## Development

### Technology Stack

#### Frontend

| Technology | Version | Purpose |
|:-----------|:-------:|:--------|
| [Vue.js](https://vuejs.org) | 3.4+ | Progressive JavaScript framework |
| [TypeScript](https://www.typescriptlang.org) | 5.4+ | Type-safe JavaScript |
| [Element Plus](https://element-plus.org) | 2.6+ | Vue 3 UI component library |
| [Pinia](https://pinia.vuejs.org) | 2.1+ | Vue state management |
| [Vue Router](https://router.vuejs.org) | 4.3+ | Vue routing |
| [Vue I18n](https://vue-i18n.intlify.dev) | 9.10+ | Internationalization |
| [Vite](https://vitejs.dev) | 5.1+ | Build tool |

#### Backend

| Technology | Version | Purpose |
|:-----------|:-------:|:--------|
| [Tauri](https://tauri.app) | 2.0 | Desktop application framework |
| [Rust](https://www.rust-lang.org) | 1.75+ | Systems programming language |
| [Windows API](https://docs.microsoft.com/windows/win32/api/) | - | Windows system calls |

### Development Commands

```bash
# Development
npm run dev              # Start frontend dev server
npm run tauri dev        # Start Tauri dev mode (hot reload)

# Building
npm run build            # Build frontend
npm run tauri build      # Build desktop app

# Code Quality
npm run lint             # ESLint check and fix
npm run lint:check       # Check only
npm run format           # Prettier format
npm run format:check      # Check formatting
npm run typecheck        # TypeScript type check

# Testing
npm run test             # Run tests
npm run test:run         # Run tests once

# Environment
npm run check:env        # Check environment
npm run setup            # Auto install dependencies
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### How to Contribute

1. **Fork** the repository
2. **Create your feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

## Acknowledgments

Special thanks to the following open source projects and contributors:

- [Tauri](https://tauri.app) - Build smaller, faster, and more secure desktop apps
- [Vue.js](https://vuejs.org) - The Progressive JavaScript Framework
- [Element Plus](https://element-plus.org) - A Vue 3 UI Library
- [Rust](https://www.rust-lang.org) - A Language Empowering Everyone
- All developers who contribute to this project

---

<div align="center">

**If you find this project helpful, please give it a ⭐ Star!**

**Made with ❤️ by [badhope](https://github.com/badhope)**

</div>
