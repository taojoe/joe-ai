# Hacker News Topic Subscriber Skill

## 目标与用途
该技能专门用于从 Hacker News (HN) 中筛选并提取与 **AI, LLM, Agent** 等特定领域相关的高质量内容。

它不依赖于复杂的 Algolia API 检索，而是利用 **hnrss.org** 提供的实时订阅源（如 `newest?points=5` 和 `show`），配合本地正则表达式进行前置精准过滤，确保获取新鲜且高质量的讨论。

## 核心功能
1.  **多主题检索**：支持配置一组 AI 关键词（如 `LLM`, `Agent`, `MLX` 等），通过正则表达式实现单词边界级别的精准匹配。
2.  **质量过滤**：仅保存点赞数（Points）超过设定阈值（当前配置为 5）的文章，过滤低质量信息。
3.  **智能去重**：自动识别已下载过的文章（基于 HN ObjectID 和发布日期），避免重复输出。
4.  **标准化输出**：将搜集到的故事统一转换为带 YAML 元数据的 Markdown 文件，方便后续 AI Agent 消费。

## 配置项 (config.json)
-   `keywords`: 搜索的主题词列表。
-   `minPoints`: 最小点赞数阈值。
-   `lastHours`: 搜索过去多少小时内的内容（建议 24 小时）。
-   `output.dir`: Markdown 产物的存放位置。

## 数据源
-   **Feed**: `https://hnrss.org/newest?points=N` and `https://hnrss.org/show`

## 输出示例
文件名格式：`YYYY-MM-DD-[title-slug]-[hn-id].md`
内容包含：
-   文章原始链接
-   HN 讨论区链接
-   作者、点赞数、评论数
-   匹配到的关键词
