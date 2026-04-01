---
name: reddit
description: 抓取 Reddit AI 相关版块 (r/LocalLLM, r/MachineLearning 等) 的热门内容并整理为结构化 Markdown
---

# Reddit AI 内容抓取

## 概述

从 Reddit 的特定 AI 版块抓取热门 (Hot) 或当日最热 (Top/Day) 内容，清洗 HTML Boilerplate 后输出带元数据的结构化 Markdown 文件。

## 数据源

针对不同版块提供不同的 RSS 策略：

- **r/MachineLearning**: Academic & Research (`top/day`)
- **r/LocalLLM**: Local Models & Hardware (`hot`)
- **r/AI_Agents**: Agentic Workflows (`hot`)
- **r/ChatGPTPro**: Prompt Engineering & Business (`hot`)
- **r/StableDiffusion**: Generative Art & Vision (`hot`)

## 用法

```bash
# 抓取预设版块内容
bun run skills/reddit/scripts/run.js

# 限制抓取数量 (每个版块)
bun run skills/reddit/scripts/run.js --limit 5
```

## 输出格式

每篇 Reddit 帖子输出为一个 Markdown 文件：

```
output/reddit/
  2026-03-31-r-locallm-llama-4-rumors.md
  2026-03-31-r-machinelearning-new-transformer-architecture.md
  ...
```

## 内容清洗规则

1. 提取核心帖子内容，移除 Reddit RSS 中的 "submitted by", "view comments" 等 HTML 链接。
2. 提取 upvotes (如果可能) 和作者信息作为元数据。
3. 清理 UTM 追踪参数。
4. 将 HTML 内容转换为基本的 Markdown 格式。
