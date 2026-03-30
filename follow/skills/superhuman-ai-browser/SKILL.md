---
name: superhuman-ai-browser
description: 通过 opencode-browser 浏览器插件抓取 Superhuman AI 每日 AI 新闻 newsletter 文章并整理为结构化 Markdown
---

# Superhuman AI 浏览器抓取

## 概述

从 Superhuman AI 网站抓取每日 AI 新闻 newsletter，清洗赞助内容后输出结构化 Markdown 文件。

本 Skill 与 `superhuman-ai` 类似，但它不使用普通的 HTTP `fetch`，而是通过 `@different-ai/opencode-browser` 调用真实浏览器会话进行抓取。这在目标网站有严格反爬防护（如 Cloudflare）或需要执行前端 JavaScript 时非常有效。

## 数据源

- **类型**: Headless Browser Scraping (Beehiiv 平台)
- **URL**: `https://www.superhuman.ai`
- **频率**: 每日一篇 newsletter
- **内容**: AI 新闻摘要、工具推荐、深度分析
- **作者**: Zain Kahn

## 抓取流程

1. **获取文章列表**：通过 opencode-browser 打开首页，提取 `a[href^="/p/"]` 链接。
2. **获取文章内容**：通过浏览器访问 `/p/{slug}` 页面，等待渲染完成。
3. **提取 DOM**：通过 browser_query 获取页面的完整 HTML 或正文文本。
4. **提取元数据**：解析结构化标签如 `<script type="application/ld+json">` 和 OG 标签。
5. **清洗内容**：过滤赞助区块、广告、模板内容。
6. **格式化输出**：转为统一结构 Markdown 文件。

## 用法

```bash
# 抓取最新文章（默认最多 10 篇）
bun run skills/superhuman-ai-browser/scripts/run.js

# 限制抓取数量并指定参数
bun run skills/superhuman-ai-browser/scripts/run.js --limit 3
```

## 输出格式

每篇 newsletter 输出为一个 Markdown 文件：

```
output/superhuman-ai-browser/
  2026-03-28-meta-s-new-ai-predicts-the-human-brain.md
  2026-03-27-turboquant-might-solve-ais-biggest-bottleneck.md
  ...
```

## 内容清洗规则

1. 移除 `PRESENTED BY xxx`、`SPONSORED BY xxx` 赞助区块
2. 去除 Beehiiv 平台模板内容（subscribe、share、follow 等按钮/链接）
3. 清理 UTM 追踪参数
4. 移除 script、style、noscript、nav、footer 等噪音元素
5. 保留核心新闻段落的层级结构
