# 贡献指南

首先，感谢你考虑为 WindowsTools 做出贡献！正是像你这样的贡献者才让这个项目变得更好。

## 行为准则

本项目和所有参与者都受我们的行为准则约束。参与本项目即表示你同意遵守该准则。

## 如何贡献

### 报告问题

在创建问题报告之前，请先检查现有的 issue 列表，确认该问题尚未被报告。创建问题报告时，请包含以下信息：

- 使用清晰且描述性的标题
- 描述重现问题的具体步骤
- 提供能够展示这些步骤的具体示例
- 描述你观察到的行为以及你期望的行为
- 如果有帮助，请附上截图
- 包含你的环境详细信息

**问题报告模板**：

```markdown
## 问题描述
[清楚描述问题]

## 重现步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

## 预期行为
[你期望发生什么]

## 实际行为
[实际发生了什么]

## 环境信息
- Windows 版本：
- 应用版本：
- 其他相关信息：
```

### 建议改进

改进建议通过 GitHub Issues 进行跟踪。创建改进建议时，请包含：

- 使用清晰且描述性的标题
- 提供建议改进的分步描述
- 提供能够展示这些步骤的具体示例
- 描述当前行为以及你期望的行为
- 解释为什么这个改进会对你有帮助

### 拉取请求（Pull Requests）

- 填写所需的模板
- 不要在 PR 标题中包含 issue 编号
- 遵循代码风格指南
- 包含经过深思熟虑、结构良好的测试
- 为新代码添加文档
- 所有文件末尾添加空行

## 开发设置

### 环境要求

| 依赖 | 版本要求 | 说明 |
|:----:|:--------:|:----:|
| Node.js | ≥ 18.0.0 | 前端运行环境 |
| Rust | ≥ 1.75.0 | Tauri 后端编译 |
| Windows | 10/11 | 操作系统 |
| Visual Studio Build Tools | 最新版 | Windows 原生编译 |
| WebView2 | 最新版 | 应用界面渲染 |

### 设置步骤

```bash
# 1. 克隆仓库
git clone https://github.com/badhope/WindowsTools.git
cd WindowsTools

# 2. 安装依赖
npm install

# 3. 确保 Rust 环境已安装
# 如果没有安装，运行：
rustup default stable

# 4. 启动开发服务器
npm run tauri dev
```

### 代码风格

我们使用以下工具来保持代码风格一致：

- **ESLint** - JavaScript/TypeScript 代码检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查

**常用命令**：

```bash
# 代码检查
npm run lint              # ESLint 检查并尝试修复
npm run lint:check        # 仅检查不修复

# 代码格式化
npm run format            # Prettier 格式化
npm run format:check      # 检查格式

# 类型检查
npm run typecheck         # TypeScript 类型检查

# 构建
npm run build             # 构建前端
npm run tauri build       # 构建桌面应用
```

## 提交规范

### 提交信息格式

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

- `feat` - 新功能
- `fix` - 错误修复
- `docs` - 文档变更
- `style` - 代码格式（不影响功能）
- `refactor` - 重构（既不修复也不添加功能）
- `perf` - 性能改进
- `test` - 添加测试
- `chore` - 构建过程或辅助工具的变更

### 示例

```bash
# 新功能
git commit -m "feat(process): 添加按名称结束进程功能"

# 错误修复
git commit -m "fix(network): 修复DNS刷新失败的bug"

# 文档更新
git commit -m "docs(readme): 更新安装说明"

# 重构
git commit -m "refactor(service): 重构服务管理模块代码"
```

## 分支管理

- `main` - 主分支，稳定版本
- `develop` - 开发分支，包含最新功能
- `feature/*` - 功能分支
- `fix/*` - 修复分支
- `hotfix/*` - 紧急修复分支

### 创建功能分支

```bash
# 1. 确保在最新主分支上
git checkout main
git pull origin main

# 2. 创建新分支
git checkout -b feature/your-feature-name

# 3. 进行开发
# ... 编辑代码 ...

# 4. 提交更改
git add .
git commit -m "feat(scope): your feature description"

# 5. 推送分支
git push origin feature/your-feature-name

# 6. 创建 Pull Request
```

## 测试

在提交代码之前，请确保：

```bash
# 运行所有检查
npm run lint
npm run typecheck
npm run test

# 构建测试
npm run tauri build
```

## 许可证

通过贡献代码，你同意你的贡献将基于 MIT 许可证授权。
