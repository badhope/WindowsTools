# Security Policy

## 支持的版本

下表列出了我们当前为安全更新提供支持的 WindowsTools 版本。

| 版本 | 是否支持 |
|------|----------|
| 2.x   | ✅ |
| 1.x   | ❌ |
| < 1.0 | ❌ |

## 报告漏洞

我们非常重视安全问题。**请不要**通过 GitHub Issue、Discussion
或公开 PR 来报告安全漏洞。

请通过以下任一私密渠道报告：

- **首选**：GitHub 仓库的
  [Security Advisories](https://github.com/badhope/WindowsTools/security/advisories/new)
  （Draft a new security advisory）
- **备选**：发邮件至 `security@windowstools.example`（如启用）

报告应包含：

- 漏洞概述与潜在影响
- 复现步骤 / PoC（代码或截图）
- 受影响的版本
- 已知的缓解方案（若有）

我们承诺：

- **48 小时内**确认收到
- **7 天内**给出初步评估与修复计划
- 修复发布后，在 [CHANGELOG.md](CHANGELOG.md) 与 GitHub Security Advisory
  中致谢报告者（除非你希望保持匿名）

## 安全设计

WindowsTools 在设计层面考虑了以下安全属性：

1. **最小特权分离**
   - `wt-service` 是唯一以 `LocalSystem` 身份运行的进程
   - `wt-agent` 保持用户态
   - 桌面 UI（`wt-ui`）从不直接调用 `wt-service`；只通过 `wt-agent`
2. **认证与防伪**
   - `wt-agent` ↔ `wt-service` 之间的命名管道通信使用
     **HMAC-SHA256** 校验每个请求
   - 会话密钥每次启动时随机生成，仅在两个进程间共享
3. **错误隔离**
   - 任何 FFI 调用都通过 `wt-win32` 包装层；`Result` 错误冒泡到 UI
   - 失败的操作不会让服务进程 panic；服务始终保持可调用
4. **审计日志**
   - 所有写操作（注册表修改、服务状态变更、Hosts 写入、计划任务运行）
     通过 `tracing` JSON 记录
   - 日志位置：`%LOCALAPPDATA%\WindowsTools\logs\`

## 已知风险

- 修改 Windows 服务 / 启动项 / 计划任务会留下持久化痕迹
- 任何"管理员操作"都必须由用户在 UI 中**显式确认**
- `wt-service` 安装后始终运行；如不需要可使用 `wt-service.exe uninstall`
  卸载
