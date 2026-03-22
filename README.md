# VisualSpider - 可视化通用爬虫软件

<div align="center">

![VisualSpider Logo](https://img.shields.io/badge/VisualSpider-v1.0.0-blue.svg)
![Vue.js](https://img.shields.io/badge/Vue-3.4+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**一款功能强大的可视化通用爬虫软件，支持复杂界面适配、链接智能识别、数据清洗等功能。**

[English](./README_EN.md) | 简体中文

</div>

---

## 📋 目录

- [特性](#-特性)
- [快速开始](#-快速开始)
- [功能模块](#-功能模块)
- [界面适配](#-界面适配)
- [链接识别](#-链接识别)
- [使用指南](#-使用指南)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [部署说明](#-部署说明)
- [常见问题](#-常见问题)
- [更新日志](#-更新日志)

---

## ✨ 特性

### 核心功能

- 🕷️ **可视化爬虫配置** - 无需编写代码，通过图形界面配置爬虫任务
- 🎯 **智能界面适配** - 支持B站、淘宝、知乎等复杂网站的自动识别和适配
- 🔗 **链接智能识别** - 自动分类识别视频、商品、用户、文章等多种链接类型
- 🧹 **数据清洗** - 支持文本去重、格式转换、正则清洗等操作
- 📊 **多样化导出** - 支持CSV、JSON、Excel、HTML、PDF、Markdown等多种格式
- 📸 **截图标注** - 支持区域截图和标注功能

### 高级功能

- 🌐 **代理服务** - 支持多种代理配置，自动轮询和故障转移
- 🔄 **任务调度** - 支持Cron表达式配置定时任务
- 📝 **NLP文本分析** - 内置NLP工具，支持关键词提取、情感分析等
- 🎨 **选择器测试** - 可视化CSS/XPath选择器测试工具
- 🔍 **URL分析器** - 高级URL解析和参数提取
- 💻 **浏览器兼容检测** - 检测浏览器兼容性并提供建议

### 界面适配

支持以下类型网站的自动适配：

| 网站类型 | 示例网站 | 支持度 |
|---------|---------|-------|
| 视频网站 | Bilibili、YouTube、优酷、爱奇艺 | ⭐⭐⭐⭐⭐ |
| 电商网站 | 淘宝、天猫、京东、拼多多 | ⭐⭐⭐⭐⭐ |
| 社交媒体 | 微博、Twitter、抖音、小红书 | ⭐⭐⭐⭐ |
| 论坛社区 | 知乎、百度贴吧、豆瓣、Reddit | ⭐⭐⭐⭐ |
| 技术博客 | 掘金、SegmentFault、CSDN、博客园 | ⭐⭐⭐⭐⭐ |
| 新闻资讯 | 新浪新闻、腾讯新闻、今日头条 | ⭐⭐⭐⭐ |
| 政府网站 | 各类政府官方网站 | ⭐⭐⭐ |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd visual-spider

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产版本
npm run build
```

### 访问应用

开发环境访问: http://localhost:5173/

生产环境: 将 `dist` 目录下的文件部署到Web服务器

---

## 📦 功能模块

### 1. 任务配置 (/)

配置爬虫任务，包括：
- 目标URL设置
- 数据字段定义
- 选择器配置
- 导出格式选择

### 2. 任务列表 (/tasks)

- 查看所有爬虫任务
- 任务状态监控
- 批量操作管理

### 3. 模板市场 (/templates)

预置多种网站爬取模板：
- B站视频列表/评论区
- 淘宝商品列表/详情
- 知乎问答/文章
- 微博帖子/评论
- 通用列表页模板

### 4. 数据清洗 (/clean)

数据清洗功能：
- 文件上传支持（JSON、CSV、TXT、HTML）
- 文本去重
- 正则替换
- 格式转换
- HTML标签移除
- 表情符号过滤

### 5. 选择器测试 (/selector)

可视化选择器工具：
- CSS选择器生成
- XPath选择器生成
- 选择器相互转换
- 实时预览效果

### 6. 截图工具 (/screenshot)

截图功能：
- 全页面截图
- 区域选择截图
- 标注工具（画笔、箭头、文字）
- 快捷键支持（Ctrl+S保存）

### 7. URL分析器 (/analyzer)

URL深度分析：
- URL组件解析
- 参数提取与操作
- 编码/解码
- 签名生成（用于反爬）
- 路径分析

### 8. 兼容检测 (/browser)

浏览器兼容性检测：
- API支持检测
- 特性检测
- 移动端模拟
- 兼容性评分

### 9. 界面适配 (/adapter)

复杂界面适配（新增）：
- 界面类型自动识别
- 推荐选择器自动生成
- 链接智能分类提取
- 预设模板快速加载

---

## 🎯 界面适配详解

### 支持的界面类型

#### 1. 视频网站（Bilibili等）

**自动识别特征：**
- 视频标题容器
- 播放量/弹幕数显示
- UP主信息
- 发布时间
- 视频封面

**推荐选择器示例：**
```css
/* 视频标题 */
.title, h3, [class*="title"]

/* 播放量 */
[class*="play"], .count, [class*="view"]

/* UP主 */
[class*="up"], [class*="author"], [class*="user"]

/* 视频链接 */
a[href*="video"], a[href*="watch"]
```

#### 2. 电商网站（淘宝/京东）

**自动识别特征：**
- 商品标题
- 价格信息
- 销量数据
- 店铺名称
- 商品图片

**推荐选择器示例：**
```css
/* 商品标题 */
.title, [class*="title"], h3

/* 价格 */
[class*="price"], .price-wrap, .goods-price

/* 销量 */
[class*="sales"], [class*="sold"], .sales-count

/* 商品链接 */
a[href*="item"], a[href*="product"]
```

#### 3. 社交媒体

**自动识别特征：**
- 帖子内容
- 用户信息
- 发布时间
- 点赞/评论/转发数

#### 4. 论坛社区

**自动识别特征：**
- 帖子标题
- 帖子内容
- 作者信息
- 回复数/查看数

---

## 🔗 链接识别详解

### 链接类型分类

| 类型 | 说明 | 识别特征 |
|-----|------|---------|
| video | 视频链接 | `/video/`、`watch?v=`、`BV` |
| article | 文章链接 | `/article/`、`/post/`、博客平台 |
| product | 商品链接 | `/item/`、`/product/`、电商域名 |
| user | 用户链接 | `/user/`、`/people/`、`/profile/` |
| comment | 评论链接 | `/comment/`、`/reply/`、`/discuss/` |
| image | 图片链接 | `.jpg`、`.png`、`.gif`、`.webp` |

### 智能识别规则

1. **URL模式识别** - 根据URL路径和参数判断类型
2. **链接文本识别** - 根据链接周围的文字判断
3. **上下文识别** - 根据链接所在容器的class/id判断

### 链接过滤

支持按以下条件过滤：
- 链接类型筛选
- 文本长度筛选
- URL正则匹配
- 仅有效链接

### 链接导出

导出的CSV包含以下字段：
- 类型（Type）
- 链接文本（Link Text）
- URL地址（URL）
- 有效性（Valid）

---

## 📖 使用指南

### 创建第一个爬虫任务

1. **进入任务配置页面**
   - 点击导航栏"任务配置"

2. **填写基本信息**
   ```
   任务名称：我的B站爬虫
   目标URL：https://api.bilibili.com/xxx
   ```

3. **配置数据字段**
   - 点击"添加字段"
   - 设置字段名称：视频标题
   - 选择选择器类型：CSS
   - 填写选择器：`.title`
   - 选择属性：text

4. **设置分页**
   - 勾选"启用分页"
   - 设置分页选择器：`.page-next`
   - 设置终止条件：最大页数100

5. **选择导出格式**
   - 支持：CSV、JSON、Excel、HTML

6. **启动任务**
   - 点击"开始抓取"
   - 实时查看进度和结果

### 使用界面适配功能

1. **进入界面适配页面**
   - 点击导航栏"界面适配"

2. **输入目标网址**
   - 例如：`https://www.bilibili.com`

3. **点击分析**
   - 系统自动识别界面类型
   - 生成推荐选择器
   - 提取并分类所有链接

4. **应用建议**
   - 查看警告信息
   - 复制推荐选择器
   - 加载预设模板

### 数据清洗流程

1. **上传文件**
   - 支持格式：JSON、CSV、TXT、HTML
   - 拖拽或点击上传

2. **选择清洗规则**
   - 去重
   - 去除HTML标签
   - 去除表情
   - 正则替换
   - 大小写转换

3. **预览结果**
   - 实时预览清洗效果

4. **导出数据**
   - 选择目标格式
   - 下载文件

### 使用选择器测试

1. **输入HTML内容**
   - 或粘贴网页源代码

2. **编写选择器**
   - CSS或XPath

3. **查看匹配结果**
   - 高亮显示匹配元素
   - 显示匹配数量

4. **转换格式**
   - CSS转XPath
   - XPath转CSS

---

## 🛠️ 技术栈

### 前端框架
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vue Router** - Vue.js官方路由管理器
- **Pinia** - Vue.js轻量级状态管理

### UI组件
- **Element Plus** - Vue 3 UI组件库

### 数据处理
- **xlsx** - Excel文件处理
- **html2canvas** - HTML转图片
- **dompurify** - HTML净化
- **turndown** - HTML转Markdown

### NLP处理
- **compromise** - 自然语言处理库

### 构建工具
- **Vite** - 下一代前端构建工具
- **vue-tsc** - TypeScript类型检查

---

## 📁 项目结构

```
visual-spider/
├── public/
│   └── test-data/          # 测试数据
├── src/
│   ├── assets/              # 静态资源
│   ├── components/           # 公共组件
│   ├── router/
│   │   └── index.ts        # 路由配置
│   ├── stores/
│   │   └── taskStore.ts    # 状态管理
│   ├── utils/              # 工具函数
│   │   ├── common.ts       # 通用工具
│   │   ├── compatibility.ts # 浏览器兼容
│   │   ├── crawler.ts      # 爬虫核心
│   │   ├── dataClean.ts    # 数据清洗
│   │   ├── export.ts       # 导出功能
│   │   ├── interfaceAdapter.ts # 界面适配
│   │   ├── nlp.ts         # NLP处理
│   │   ├── performance.ts # 性能优化
│   │   ├── proxy.ts       # 代理服务
│   │   ├── scheduler.ts   # 任务调度
│   │   ├── screenshot.ts  # 截图功能
│   │   ├── selectors.ts   # 选择器工具
│   │   └── urlParser.ts   # URL解析
│   ├── views/              # 页面组件
│   │   ├── BrowserInfo.vue
│   │   ├── DataClean.vue
│   │   ├── InterfaceAdapter.vue
│   │   ├── Screenshot.vue
│   │   ├── SelectorTester.vue
│   │   ├── Settings.vue
│   │   ├── TaskConfig.vue
│   │   ├── TaskList.vue
│   │   ├── Templates.vue
│   │   └── UrlAnalyzer.vue
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── extension/              # Chrome扩展
│   ├── manifest.json
│   ├── content.js
│   └── popup.js
├── server/                 # Puppeteer服务
│   └── puppeteer-server.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 部署说明

### 构建生产版本

```bash
# 安装依赖
npm install

# 构建
npm run build

# 预览构建结果
npm run preview
```

### 部署到静态托管

#### Netlify

1. 在Netlify创建一个新站点
2. 连接Git仓库或直接上传 `dist` 文件夹
3. 自动部署

#### Vercel

```bash
npm install -g vercel
vercel --prod
```

#### GitHub Pages

1. 在GitHub创建仓库
2. 上传代码
3. 在Settings中启用GitHub Pages
4. 选择 `dist` 分支

#### 手动部署

将 `dist` 目录下的所有文件上传到Web服务器（如Nginx、Apache）即可。

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## ❓ 常见问题

### Q: 爬虫无法获取数据？

**A:** 可能原因及解决方案：
1. 网站需要登录验证 → 尝试使用Cookie或代理
2. 数据通过JavaScript动态渲染 → 启用JS渲染模式
3. 触发了反爬机制 → 增加请求间隔或使用代理

### Q: 如何处理分页？

**A:**
1. 在任务配置中启用分页
2. 设置分页选择器
3. 配置最大页数或终止条件

### Q: 导出格式如何选择？

**A:**
- **CSV** - 通用表格数据，Excel可直接打开
- **JSON** - 便于程序处理，保留数据结构
- **Excel** - 支持多Sheet、公式、样式
- **HTML** - 保留原始格式，便于展示
- **PDF** - 适合报告生成
- **Markdown** - 适合文档编写

### Q: 界面适配不准确怎么办？

**A:**
1. 检查网址是否正确
2. 尝试加载对应的预设模板
3. 手动调整推荐的选择器
4. 使用选择器测试工具验证

### Q: 如何处理登录验证的网站？

**A:**
1. 使用浏览器开发者工具获取Cookie
2. 在任务配置中设置请求头
3. 使用Chrome扩展配合

---

## 📊 更新日志

### v1.0.1 (2024-03)

**新增功能：**
- ✨ 界面适配模块（InterfaceAdapter）
  - 自动识别网站类型（B站、淘宝、知乎等）
  - 智能推荐CSS选择器
  - 链接自动分类提取
  - 预设模板快速加载
- 🔗 增强的链接识别机制
  - 支持7种链接类型分类
  - 链接过滤和去重
  - CSV格式导出

**优化改进：**
- ⚡ 提升选择器生成算法准确性
- 🎨 优化界面适配页面UI
- 🐛 修复若干Bug

### v1.0.0 (2024-01)

**初始版本发布：**
- 🕷️ 可视化爬虫配置
- 📊 数据导出功能
- 🧹 数据清洗工具
- 📸 截图标注功能
- 🌐 代理服务支持
- 🔄 任务调度功能

---

## 📄 许可证

本项目基于 MIT 许可证开源。

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3 UI组件库
- [Vite](https://vitejs.dev/) - 快速的前端构建工具
- [xlsx](https://sheetjs.com/) - Excel文件处理库
- [html2canvas](https://html2canvas.hertzen.com/) - HTML转图片库

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐**

</div>
