# Product Hunt AI Skill

## 目标 (Objective)
抓取 Product Hunt 上 `Artificial Intelligence` 分类的每日热门产品，清洗并生成结构化的 Markdown 資料集。

## 数据规格 (Data Source)
- **URL**: `https://www.producthunt.com/feed?category=artificial-intelligence`
- **格式**: Atom Feed (XML)
- **频率**: 建议每天执行一次

## 输出定义 (Output)
- **路径**: `output/producthunt-ai/`
- **文件名格式**: `YYYY-MM-DD-{product-slug}.md`
- **元数据 (YAML)**:
    - `title`: 产品名称
    - `tagline`: 产品简介
    - `url`: Product Hunt 详情页
    - `hunter`: 发现者
    - `published_at`: 发布日期
    - `source`: "Product Hunt"

## 处理逻辑 (Logic)
1. **获取 (Fetch)**: 使用 `rss-parser` 获取 Atom Feed。
2. **解析 (Parse)**: 
   - 从 `<entry><title>` 提取产品名。
   - 从 `<entry><content>` 解析 HTML，提取第一个 `<p>` 为 Tagline。
   - 从 `<entry><link>` 获取 Product Hunt 链接。
3. **清洗 (Clean)**: 去除内容中的追踪参数 (`utm_...`)。
4. **归档 (Archive)**: 检查输出目录，如果同名文件已存在则跳过。
