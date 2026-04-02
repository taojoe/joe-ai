---
name: producthunt-daily
description: 每日抓取 Product Hunt Top 20 Featured 产品，清洗并输出为结构化 Markdown。
---

# Product Hunt Daily Skill

## 目标

每日抓取 Product Hunt 官网上 **Top 20 Featured** 的产品，提取其核心元数据（如官网、投票数、主题标签、制作者信息），并输出为结构化的 Markdown 文件。

## 执行流程

本 Skill 的完整任务分为两个阶段：

1.  **第一阶段：数据抓取 (Scraping)**
    - **目标**：调用 Product Hunt API 抓取每日 Top 20 产品的原始数据，并在 `output/producthunt-daily/` 下生成 `index.md` 及相关图片。
    - **运行命令**：
      ```bash
      bun run producthunt-daily
      ```

2.  **第二阶段：内容翻译 (Translation)**
    - **目标**：使用 MiniMax LLM 自动将抓取的原始数据翻译并重组为精美的中文版本 `zh.md`。
    - **运行命令**：
      ```bash
      bun run producthunt-daily-translate
      ```
    - **说明**：该脚本会自动遍历输出目录，读取 `index.md` 并调用 MiniMax-M2.7 模型生成中文版本。
