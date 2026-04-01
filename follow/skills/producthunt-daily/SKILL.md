# Product Hunt Daily Skill

## 目标
每日抓取 Product Hunt 官网上 **Top 20 Featured** 的产品，提取其核心元数据（如官网、投票数、主题标签、制作者信息），并输出为结构化的 Markdown 文件。

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

## 配置 (Environment Variables)
必须在 `.env` 中配置：
- `PH_CLIENT_ID`: 使用 Product Hunt Dashboard 提供的 API Key。
- `PH_CLIENT_SECRET`: 使用 Product Hunt Dashboard 提供的 API Secret。
