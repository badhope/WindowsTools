# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Vue 3.5 + Vite 5 + Pinia 2 + vue-router 4 + vue-i18n 10 frontend
- 12 top-level views: Dashboard, Processes, Services, Registry, Network,
  Disk, Startup, Performance, Hosts, Repair, Tasks, Settings, plus 404
- Command palette (Ctrl/Cmd + K) backed by a JSON manifest with 35 commands
- Theme + language switching persisted via Pinia store
- GitHub Actions CI workflow (`ci.yml`) for Rust + Vue on `windows-latest`
- GitHub Actions release workflow (`release.yml`) producing MSI + NSIS bundles
- GitHub Actions CodeQL workflow (`codeql.yml`) for security analysis
- Pull request and issue templates under `.github/`
- `rust-toolchain.toml` pinning `stable`
- `.gitignore` covering `target/`, `node_modules/`, `dist/`, Tauri build output

### Changed
- Workspace reorganised into 5 crates: `wt-core`, `wt-win32`, `wt-service`,
  `wt-agent`, `wt-ui`
- `wt-ui` is now a Tauri 2 host (Vue 3 SPA + Rust IPC bridge)
- `wt-agent` runs in user mode and exposes a JSON-RPC server on stdio
- `wt-service` runs in SYSTEM mode and exposes a Named Pipe server
- IPC between agent and service authenticated with HMAC-SHA256

### Fixed
- tauri-build panic on Windows when the `rc.exe` invocation is sandboxed
  (workaround: minimal `build.rs` that lets the app pick its icon at runtime)
- `[[bin]]` collision in `wt-ui` (removed, cargo auto-detects `src/main.rs`)

## [0.1.0] - 2024-09-15

### Added
- Initial single-crate Tauri 1 + Vue 2 prototype (now superseded by 2.x)

[Unreleased]: https://github.com/badhope/WindowsTools/compare/v2.0.0...HEAD
[0.1.0]: https://github.com/badhope/WindowsTools/releases/tag/v0.1.0
