# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-03-28

### Added

#### Help System
- **Help Center Panel** - Comprehensive help documentation with search functionality
- **Inline Help Tips** - Contextual help tooltips throughout the application
- **User Guide Tour** - Interactive onboarding guide for new users
- **Reset Guide Button** - Option to reset and replay the user guide in settings

#### Quick Actions Expansion
- Performance Monitor (perfmon.msc)
- Resource Monitor (resmon.exe)
- System Configuration (msconfig.exe)
- Network Connections (ncpa.cpl)
- Windows Firewall (firewall.cpl)
- Windows Update settings
- Programs and Features (appwiz.cpl)
- User Accounts management (netplwiz.exe)

### Fixed

#### Encoding Issues (Critical)
- **PowerShell Output Encoding** - Fixed garbled Chinese text in PowerShell command output
- **System Information Encoding** - Corrected display of Chinese characters in system info
- **Service Names Encoding** - Fixed encoding for Windows service display names
- **Process Information Encoding** - Resolved encoding issues in process details
- **Network Tools Encoding** - Fixed encoding in network connection details
- **Disk Information Encoding** - Corrected encoding in disk management output
- **Registry Export Encoding** - Fixed encoding when exporting registry keys

#### Internationalization
- Added missing translation keys for all modules
- Fixed hardcoded text in Processes view
- Fixed hardcoded text in Registry view
- Completed translation coverage across all components

### Improved

#### User Experience
- Better error messages with proper encoding
- Improved Chinese character display throughout the application
- Enhanced onboarding experience for new users
- More comprehensive help documentation

#### Technical
- Added `encoding_rs` crate for proper GBK/UTF-8 encoding conversion
- PowerShell commands now explicitly set UTF-8 output encoding
- All system command outputs properly decoded for Chinese Windows systems

---

## [1.0.0] - 2025-03-28

### Added

#### Core Features
- **Dashboard** - System information overview with quick access to all modules
- **PowerShell Command Center** - Visual command execution with templates and history
- **Registry Manager** - Browse, edit, search, and export registry keys and values
- **Service Manager** - View, start, stop, and restart Windows services
- **Process Manager** - Real-time monitoring with CPU/memory sorting and priority adjustment
- **Network Tools** - Connection viewer, port usage analysis, and DNS management
- **Disk Tools** - Space analysis, disk cleanup, and health monitoring
- **Quick Actions** - One-click access to common Windows system tools
- **System Optimization** - Startup items, scheduled tasks, and temp file cleanup
- **Advanced Tools** - Environment variables editor, Hosts file editor, SFC/DISM repair

#### Internationalization
- 🇨🇳 Simplified Chinese (zh-CN)
- 🇺🇸 English (en)
- Language switching in settings with persistent storage

#### UI/UX
- Modern, clean interface built with Element Plus
- Dark/Light/Auto theme modes
- Customizable primary colors
- Responsive layout
- Real-time data updates

#### Technical
- Built with Tauri 2.0 for minimal resource usage
- Vue 3 + TypeScript for type-safe frontend
- Rust backend for high-performance system operations
- Windows API integration for native functionality

### Technical Details

#### Frontend Stack
- Vue 3.4 with Composition API
- TypeScript 5.4
- Element Plus 2.6
- Pinia 2.1 for state management
- Vue I18n 9.10 for internationalization
- Vue Router 4.3

#### Backend Stack
- Tauri 2.0
- Rust 1.75+
- Windows API bindings
- Tokio for async operations

### Security
- No telemetry or data collection
- Local-only operation
- Admin privilege requests clearly indicated

---

## Future Plans

### [1.2.0] - Planned
- Performance monitoring graphs
- Custom command templates
- Registry backup/restore
- Batch operations for services
- Network speed test
- More language support

### [1.3.0] - Planned
- Plugin system
- Custom themes
- Keyboard shortcuts
- Export/import settings
- System restore point management

---

[1.1.0]: https://github.com/badhope/WindowsTools/releases/tag/v1.1.0
[1.0.0]: https://github.com/badhope/WindowsTools/releases/tag/v1.0.0
