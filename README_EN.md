# VisualSpider - Visual Universal Crawler

A powerful visual web crawler software with intelligent interface adaptation, link recognition, and data cleaning capabilities.

## Features

- 🕷️ **Visual Crawler Configuration** - Configure crawler tasks through GUI without coding
- 🎯 **Smart Interface Adaptation** - Auto-recognize and adapt complex websites (Bilibili, Taobao, Zhihu, etc.)
- 🔗 **Intelligent Link Recognition** - Auto-classify video, product, user, article links
- 🧹 **Data Cleaning** - Deduplication, format conversion, regex cleaning
- 📊 **Multi-format Export** - CSV, JSON, Excel, HTML, PDF, Markdown
- 📸 **Screenshot & Annotation** - Full page/region capture with annotation tools
- 🌐 **Proxy Service** - Multi-proxy support with auto rotation
- 🔄 **Task Scheduling** - Cron-based scheduled tasks
- 📝 **NLP Text Analysis** - Keyword extraction, sentiment analysis
- 🎨 **Selector Testing** - Visual CSS/XPath selector testing
- 🔍 **URL Analyzer** - Advanced URL parsing and parameter extraction
- 💻 **Browser Compatibility** - API and feature detection

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Interface Adaptation

Automatically adapts to these website types:

| Type | Examples | Support |
|------|----------|---------|
| Video | Bilibili, YouTube | ⭐⭐⭐⭐⭐ |
| E-commerce | Taobao, JD, Pinduoduo | ⭐⭐⭐⭐⭐ |
| Social | Weibo, Douyin | ⭐⭐⭐⭐ |
| Forum | Zhihu, Reddit | ⭐⭐⭐⭐ |
| Blog | Juejin, CSDN | ⭐⭐⭐⭐⭐ |

## Link Recognition

Classifies links into 7 types:
- `video` - Video links
- `article` - Article links
- `product` - Product links
- `user` - User profile links
- `comment` - Comment links
- `image` - Image links
- `other` - Other links

## License

MIT
