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
    - **目标**：将抓取的原始数据翻译并重组为精美的中文版本 `zh.md`。
    - **操作规范**：
        - 请 AI Agent 严格参考 [translate.md](translate.md) 中的指令及 [examples/sample_zh.md](examples/sample_zh.md) 模板执行。
        - **原子化顺序执行 (Strict Atomic Loop)**：
            1. **禁止批量读取**：严禁一次性读取多个产品的 `index.md`。
            2. **单品闭环**：必须按照“读取 A -> 翻译 A -> 保存 A -> 输出 A 的状态”的原子步骤完整执行。
            3. **串行推进**：必须在产品 A 的翻译保存**全部完成后**，才能开始产品 B 的任何操作（包括读取）。
            4. **全过程可见**：每一步操作（如读取、翻译、保存）都需在前台即时汇报。
