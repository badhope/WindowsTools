# Contributing to VisualSpider

Thank you for your interest in contributing to VisualSpider! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. We expect:

- **Respect**: Treat all contributors and users with respect
- **Collaboration**: Work together professionally
- **Feedback**: Provide constructive feedback
- **Community**: Help build a welcoming community

---

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/visual-spider.git
   cd visual-spider
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nicholasjq/visual-spider.git
   ```

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies (optional)
cd server && npm install
cd ..
```

### Development Workflow

```bash
# Start frontend dev server
npm run dev

# Start backend server (in another terminal)
npm run dev:server

# Run type checking
npm run typecheck

# Run linter with auto-fix
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

---

## Making Changes

### 1. Create a Branch

Create a feature branch from `main`:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/your-bug-fix
```

### 2. Branch Naming Convention

| Type | Example |
|------|---------|
| Feature | `feature/add-proxy-pool` |
| Bug Fix | `fix/selector-timeout` |
| Hotfix | `hotfix/security-patch` |
| Refactor | `refactor/data-cleanup` |
| Documentation | `docs/update-readme` |

### 3. Make Your Changes

- Write clean, maintainable code
- Follow the coding standards
- Add/update tests as needed
- Update documentation

---

## Pull Request Process

### Before Submitting

1. **Run all checks**:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Submit PR

1. Open a Pull Request on GitHub
2. Fill in the PR template:
   - **Title**: Clear, concise summary
   - **Description**: Explain what and why
   - **Screenshots**: If UI changes
   - **Tests**: Add test evidence
   - **Checklist**: Mark completed items

### PR Template

```markdown
## Description
<!-- What does this PR do? -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No linting errors
```

---

## Coding Standards

### Vue/TypeScript

- Use **Composition API** with `<script setup>`
- Define proper **TypeScript types**
- Use **PascalCase** for components
- Use **camelCase** for variables and functions
- Prefer **const** over let
- Add **JSDoc comments** for complex functions

### Style Guide

```typescript
// ✅ Good
interface UserProfile {
  id: string
  name: string
  email: string
}

const fetchUser = async (id: string): Promise<UserProfile> => {
  // implementation
}

// ❌ Bad
interface user {
  Id: number
  Name: string
}

function FetchUser(id) {
  // implementation
}
```

### File Organization

```
src/
├── components/    # Small, reusable components
├── views/         # Page-level components
├── composables/   # Vue composables (reusable logic)
├── utils/         # Pure utility functions
├── types/         # TypeScript interfaces/types
└── locales/       # i18n files
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test -- --watch
```

### Write Tests

```typescript
// src/utils/__tests__/example.test.ts
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../yourFunction'

describe('yourFunction', () => {
  it('should do something', () => {
    expect(yourFunction(input)).toBe(expected)
  })
})
```

### Test Coverage Goals

| Type | Target |
|------|--------|
| Components | 80%+ |
| Utils | 90%+ |
| Services | 85%+ |

---

## Reporting Issues

### Bug Report Template

```markdown
## Bug Description
<!-- Clear description of the bug -->

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
<!-- What should happen -->

## Screenshots
<!-- If applicable -->

## Environment
 - OS: [e.g., Windows 11]
 - Browser: [e.g., Chrome 120]
 - Version: [e.g., 1.0.1]

## Additional Context
<!-- Any other context -->
```

### Feature Request Template

```markdown
## Feature Description
<!-- Clear description of the feature -->

## Use Case
<!-- How would this feature be used? -->

## Proposed Solution
<!-- Your proposed implementation -->

## Alternatives
<!-- Any alternative solutions -->
```

---

## Questions?

- **GitHub Discussions**: For questions
- **GitHub Issues**: For bugs and features
- **Email**: support@visualspider.dev

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<p align="center">
  <strong>Thank you for contributing to VisualSpider! 🙏</strong>
</p>
