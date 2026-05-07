# Contributing to WindowsTools

First of all, thank you for considering contributing to WindowsTools! It's contributors like you who make this project better.

## Code of Conduct

This project and all participants are governed by our Code of Conduct. By participating, you agree to uphold this code.

## How to Contribute

### Reporting Issues

Before creating an issue, please check the existing issue list to make sure the problem hasn't already been reported. When creating an issue, please include:

- A clear and descriptive title
- Detailed steps to reproduce the problem
- Specific examples that demonstrate these steps
- A description of the observed behavior and what you expected
- Screenshots if helpful
- Your environment details

**Issue Report Template:**

```markdown
## Bug Description
[Clear description of the issue]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- Windows Version:
- App Version:
- Other relevant info:
```

### Feature Suggestions

Feature suggestions are tracked through GitHub Issues. When creating a suggestion, please include:

- A clear and descriptive title
- A detailed step-by-step description of the suggested improvement
- Specific examples that demonstrate these steps
- A description of the current behavior and what you expected
- Explain why this improvement would be helpful to you

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the code style guidelines
- Include well-considered, well-structured tests
- Document new code
- Add a blank line at the end of all files

## Development Setup

### Requirements

| Dependency | Version | Description |
|:-----------|:-------:|:------------|
| Node.js | ≥ 18.0.0 | Frontend runtime |
| Rust | ≥ 1.75.0 | Tauri backend compilation |
| Windows | 10/11 | Operating system |
| Visual Studio Build Tools | Latest | Windows native compilation |
| WebView2 | Latest | Application rendering |

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/badhope/WindowsTools.git
cd WindowsTools

# 2. Install dependencies
npm install

# 3. Ensure Rust is installed
# If not installed, run:
rustup default stable

# 4. Start development server
npm run tauri dev
```

### Code Style

We use the following tools to maintain consistent code style:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

**Common Commands:**

```bash
# Linting
npm run lint              # ESLint check and fix
npm run lint:check        # Check only

# Formatting
npm run format            # Prettier format
npm run format:check       # Check formatting

# Type checking
npm run typecheck         # TypeScript type check

# Building
npm run build             # Build frontend
npm run tauri build       # Build desktop app
```

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code formatting (no functional changes)
- `refactor` - Refactoring (neither fixes nor adds features)
- `perf` - Performance improvements
- `test` - Adding tests
- `chore` - Build process or auxiliary tool changes

### Examples

```bash
# New feature
git commit -m "feat(process): add end process by name feature"

# Bug fix
git commit -m "fix(network): fix DNS flush failure"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactoring
git commit -m "refactor(service): refactor service management module"
```

## Branch Management

- `main` - Main branch, stable version
- `develop` - Development branch, latest features
- `feature/*` - Feature branches
- `fix/*` - Fix branches
- `hotfix/*` - Emergency fix branches

### Creating a Feature Branch

```bash
# 1. Ensure you're on the latest main branch
git checkout main
git pull origin main

# 2. Create a new branch
git checkout -b feature/your-feature-name

# 3. Develop
# ... Edit code ...

# 4. Commit changes
git add .
git commit -m "feat(scope): your feature description"

# 5. Push the branch
git push origin feature/your-feature-name

# 6. Create Pull Request
```

## Testing

Before submitting code, please ensure:

```bash
# Run all checks
npm run lint
npm run typecheck
npm run test

# Build test
npm run tauri build
```

## License

By contributing code, you agree that your contribution will be licensed under the MIT License.
