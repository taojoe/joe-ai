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
    - **操作规范**：请 AI Agent 严格参考 [translate.md](translate.md) 中的指令及 [examples/sample_zh.md](examples/sample_zh.md) 模板执行。

> **注意**：脚本运行依赖根目录下的 `.env` 文件（需包含 `PH_CLIENT_ID` 和 `PH_CLIENT_SECRET`）。

## 数据源

- **API**: Product Hunt API v2 (GraphQL)
- **Endpoint**: `https://api.producthunt.com/v2/api/graphql`
- **Auth**: OAuth2 Client Credentials (Bearer Token)

## 更新频次

建议每日运行一次。脚本默认抓取“昨日”的产品，以确保投票数和排名已经稳定。

## 输出格式

输出至 `output/producthunt-daily/` 文件夹。
文件名格式：`YYYY-MM-DD-product-slug.md`

### Markdown 结构

- **YAML Frontmatter**: 包含 `title`, `tagline`, `votes`, `url`, `website`, `date`, `topics`, `makers`.
- **Body**: 包含产品详细描述、缩略图和展示媒体（截图/视频）。
