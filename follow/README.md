# Follow — 信息源抓取 Agent Skills

一系列 Agent Skills，用于从各类信息源（newsletter、RSS、社交媒体等）抓取内容并整理到本地。

## 项目结构

```
follow/
├── shared/          # 共享工具模块（RSS 解析、内容清洗、Markdown 格式化等）
├── skills/          # Agent Skills 目录，每个子目录是一个独立的 skill
│   └── therundown-ai/   # The Rundown AI 文章抓取
└── output/          # 全局输出目录
```

## 快速开始

```bash
# 安装依赖
bun install

# 运行某个 skill
bun run skills/therundown-ai/scripts/run.js
```

## 添加新 Skill

1. 在 `skills/` 下创建新目录
2. 添加 `SKILL.md` 描述 skill 功能
3. 添加 `config.json` 配置数据源
4. 在 `scripts/` 下实现抓取逻辑
5. 输出文件存放在 skill 内部的 `output/` 目录

## 已有 Skills

| Skill | 数据源 | 说明 |
|-------|--------|------|
| `therundown-ai` | RSS (Beehiiv) | The Rundown AI 每日 AI 新闻 newsletter |

## 技术栈

- **Runtime**: Node.js / Bun (ESM)
- **Package Manager**: Bun
- **RSS 解析**: rss-parser
- **HTML 清洗**: cheerio
- **模板引擎**: handlebars
