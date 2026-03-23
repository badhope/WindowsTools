# 🕷️ VisualSpider

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.1-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.4-brightgreen.svg" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg" alt="Node">
</p>

> 🌍 **[English](README.md)** | **[中文](README_zh-CN.md)**

---

## 📖 Overview

**VisualSpider** is a powerful, user-friendly visual web crawler that enables users to extract data from any website without writing code. Built with Vue 3 and Element Plus, it provides an intuitive graphical interface for configuring crawling tasks, testing selectors, cleaning data, and exporting results in multiple formats.

### ✨ Key Features

- 🎨 **Visual Configuration** - Point-and-click interface for configuring crawl tasks
- 🔍 **Smart Selector Testing** - Test CSS and XPath selectors in real-time
- 🧹 **Data Cleaning** - Built-in tools for text processing and data normalization
- 📊 **Multiple Export Formats** - Export to CSV, JSON, Excel, HTML, PDF, Markdown, and more
- 🌐 **Internationalization** - Full support for English and Chinese languages
- 🔄 **Browser Automation** - Puppeteer-powered backend for JavaScript-rendered pages
- 🖥️ **Interface Adaptation** - Intelligent handling of complex website structures
- 📸 **Screenshot Capture** - Full-page and region screenshots with annotations
- 🛡️ **Error Handling** - Clear error messages and comprehensive logging
- ⚡ **Performance Optimization** - Efficient batch processing and caching

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|------------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| Chromium | For Puppeteer (optional) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/nicholasjq/visual-spider.git
cd visual-spider

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies (optional, for Puppeteer support)
cd server && npm install
cd ..

# 4. Start development server
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:3000/

### Environment Setup

If you encounter Chromium installation issues, run:

```bash
npm run setup:env
```

This will automatically detect and configure the runtime environment.

---

## 🎯 Usage Guide

### 1. Create a Crawl Task

1. Navigate to **Task Config** page
2. Enter the target URL
3. Add data selectors (CSS or XPath)
4. Configure pagination (optional)
5. Click **Start Crawling**

### 2. Test Selectors

Use the **Selector Tester** tool to validate your selectors before running a task:

```
# CSS Selector examples
.product-card .title
#item-price
div[data-product]

# XPath examples
//div[@class='product-card']//h3
//span[@id='price']
```

### 3. Clean Data

Upload raw data files (CSV, JSON, Excel) to the **Data Clean** page for processing:

- Remove duplicates
- Trim whitespace
- Find and replace
- Regular expression operations

### 4. Export Results

Supported export formats:

| Format | Extension | Description |
|--------|-----------|-------------|
| CSV | .csv | Comma-separated values |
| JSON | .json | JavaScript Object Notation |
| Excel | .xlsx | Microsoft Excel workbook |
| HTML | .html | HTML table format |
| PDF | .pdf | Portable Document Format |
| Markdown | .md | Markdown table |
| TSV | .tsv | Tab-separated values |
| XML | .xml | Extensible Markup Language |

---

## 🏗️ Project Structure

```
visual-spider/
├── src/
│   ├── components/       # Reusable Vue components
│   │   ├── LanguageSwitcher.vue
│   │   ├── LogViewer.vue
│   │   ├── NotificationPanel.vue
│   │   ├── ErrorDetail.vue
│   │   └── WelcomeGuide.vue
│   ├── views/           # Page components
│   │   ├── TaskConfig.vue
│   │   ├── TaskList.vue
│   │   ├── DataClean.vue
│   │   ├── SelectorTester.vue
│   │   ├── Screenshot.vue
│   │   ├── UrlAnalyzer.vue
│   │   ├── BrowserInfo.vue
│   │   ├── InterfaceAdapter.vue
│   │   ├── ServerManager.vue
│   │   └── Settings.vue
│   ├── locales/         # Internationalization files
│   │   ├── en.json
│   │   └── zh-CN.json
│   ├── stores/          # Pinia state management
│   ├── router/          # Vue Router configuration
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── server/              # Backend server (Puppeteer)
│   └── src/
│       ├── routes/      # API routes
│       └── utils/       # Server utilities
├── public/              # Static assets
│   └── test-pages/      # Test pages for development
└── dist/                # Production build output
```

---

## 🌍 Internationalization

VisualSpider supports **English** and **Chinese** languages. Click the 🌐 icon in the header to switch languages.

### Adding New Languages

1. Create a new locale file in `src/locales/` (e.g., `ja.json` for Japanese)
2. Add the locale to `src/locales/index.ts`
3. Update the language switcher component

---

## 🔧 Advanced Features

### Proxy Pool Management

Configure proxy servers for improved crawling:

```bash
# Add proxies via the Proxy panel
http://proxy1.example.com:8080
https://user:pass@proxy2.example.com:8080
socks5://proxy3.example.com:1080
```

### Task Scheduling

Schedule tasks using Cron expressions:

```
# Every hour
0 * * * *

# Every day at midnight
0 0 * * *

# Every Monday at 9 AM
0 9 * * 1
```

### Browser Automation

The backend server provides browser automation capabilities:

- Launch headless Chrome
- Navigate to pages
- Execute JavaScript
- Take screenshots
- Extract dynamic content

---

## 📝 API Reference

### Frontend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/crawler/crawl | Start crawl task |
| GET | /api/crawler/status/:id | Get task status |
| POST | /api/browser/launch | Launch browser |
| POST | /api/browser/screenshot | Take screenshot |
| GET | /api/proxy/list | List proxies |
| POST | /api/proxy/test | Test proxy |

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting pull requests.

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm run test
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [Element Plus](https://element-plus.org/) - A Vue.js UI Library
- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [xlsx](https://sheetjs.com/) - SheetJS Excel/CSV Parser
- [html2canvas](https://html2canvas.hertzen.com/) - HTML-to-Canvas converter

---

## 📧 Contact

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/nicholasjq/visual-spider/issues)
- **Email**: support@visualspider.dev

---

<p align="center">
  <strong>Made with ❤️ by the VisualSpider Team</strong>
  <br>
  <sub>⭐ Star this repo if you find it useful!</sub>
</p>
