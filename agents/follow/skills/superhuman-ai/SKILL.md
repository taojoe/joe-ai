---
name: superhuman-ai
description: 抓取 Superhuman AI 每日 AI 新闻 newsletter 文章并整理为结构化 Markdown
---

# Superhuman AI 文章抓取

## 概述

从 Superhuman AI 网站直接抓取每日 AI 新闻 newsletter，清洗赞助内容后输出结构化 Markdown 文件。

由于 Superhuman AI 没有暴露公开的 RSS Feed，本 Skill 采用直接 HTTP 网页抓取的方式获取内容。

## 数据源

- **类型**: Web Scraping (Beehiiv 平台)
- **URL**: `https://www.superhuman.ai`
- **频率**: 每日一篇 newsletter
- **内容**: AI 新闻摘要、工具推荐、深度分析
- **作者**: Zain Kahn

## 抓取流程

1. **获取文章列表**：从首页和 `/archive?page=N` 提取 `a[href^="/p/"]` 链接
2. **获取文章内容**：逐篇访问 `/p/{slug}` 页面
3. **提取元数据**：从 `<script type="application/ld+json">` 获取标题、日期、作者
4. **提取正文**：从 `#content-blocks` 元素获取文章 body HTML
5. **清洗内容**：过滤赞助区块、广告、模板内容
6. **格式化输出**：转为统一结构 Markdown 文件

## 用法

```bash
# 抓取最新文章（默认最多 10 篇）
bun run skills/superhuman-ai/scripts/run.js

# 限制抓取数量
bun run skills/superhuman-ai/scripts/run.js --limit 3
```

## 输出格式

每篇 newsletter 输出为一个 Markdown 文件：

```
output/superhuman-ai/
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
