# GitHub Daily AI Trending Skill

## 项目逻辑

该 Skill 的核心目的是从 GitHub 上获取过去 24 小时内最热门的 AI 相关项目。它不仅获取项目的基本信息，还会深入每个项目的 `README.md` 来提取其核心价值。

### 抓取逻辑
1.  **数据源**: GitHub Search API。
2.  **筛选标准**:
    -   Topic 包含 `ai-agents`, `llm`, `rag`, `product` 中的任意一个。
    -   过去 24 小时内有 Star 或创建。
    -   按 `stars` 降序排列。
3.  **解析逻辑**:
    -   获取 `README.md` 的内容。
    -   使用 `cheerio` 解析 Markdown/HTML，找到描述项目的核心段落。
    -   自动识别 “Features” 或 “Highlights” 列表。
4.  **分类决策**:
    -   根据仓库标签 (Topics) 和 README 中的关键词进行分类标签打标。

### 输出说明
-   **目标目录**: `output/github-daily/`
-   **文件名格式**: `YYYY-MM-DD-repo-name.md`
-   **元数据**: 包含链接、描述、Star 数、分类标签及核心亮点摘要。
