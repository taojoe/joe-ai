---
name: therundown-ai
description: 抓取 The Rundown AI 每日 AI 新闻 newsletter 文章并整理为结构化 Markdown
---

# The Rundown AI 文章抓取

## 概述

从 The Rundown AI 的 Beehiiv RSS Feed 抓取每日 AI 新闻 newsletter，清洗赞助内容后输出结构化 Markdown 文件。

## 数据源

- **类型**: RSS Feed (Beehiiv)
- **URL**: `https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml`
- **频率**: 每日一篇 newsletter
- **内容**: AI 新闻摘要、工具推荐、社区工作流

## 用法

```bash
# 抓取最新文章
bun run skills/therundown-ai/scripts/run.js

# 限制抓取数量
bun run skills/therundown-ai/scripts/run.js --limit 5
```

## 输出格式

每篇 newsletter 输出为一个 Markdown 文件：

```
output/therundown-ai/
  2026-03-28-meta-new-open-source-brain-ai.md
  2026-03-27-arc-agi-3-resets-frontier-ai-scoreboard.md
  ...
```

## 内容清洗规则

1. 移除 `TOGETHER WITH xxx`、`PRESENTED BY xxx` 赞助区块
2. 去除 Beehiiv RSS 产生的重复 bullet points
3. 去除 newsletter 模板内容（sign up、advertise 等链接）
4. 清理 UTM 追踪参数
5. 保留核心新闻段落的层级结构
