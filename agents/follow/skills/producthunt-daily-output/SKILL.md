# Product Hunt Daily Output (Chinese Edition)

## 目标
将 `output/producthunt-daily/[date]/[rank-slug]/index.md` 翻译成精美的中文版本 `zh.md`，并将同日期下的所有产品合并为一份每日汇总 `index.md`。

## 操作流程 (AI Agent Instructions)

### 第一阶段：单品翻译 (Translate -> zh.md)
对 `output/producthunt-daily/[date]/` 下的每一个子目录（例如 `01-name`）执行以下操作：
1. **读取内容**：读取 `index.md`。
2. **提取媒体**：
   - 封面图：优先使用 `images/media-0.png` 或 `images/media-0.jpeg`，若不存在则使用 `images/thumb.png`。
3. **内容翻译与重组**：按以下格式生成 `zh.md`：
   - **封面图片**：显示封面图。
   - **产品名称与标语**：显示中文翻译。
   - **核心亮点**：将 `Description` 翻译成生动的中文段落。
   - **关键信息**：
     - 投票数 (Votes)
     - 官网 (Website)
     - 分类 (Topics - 翻译成中文)
     - Product Hunt 链接
4. **保存文件**：在同一目录下保存为 `zh.md`。

### 第二阶段：汇总合并 (Consolidation -> Daily Digest)
1. **创建汇总目录**：在 `output/producthunt-daily-output/[date]/` 创建目录，并在其中创建 `images/` 子文件夹。
2. **资源提取与本地化**：
   - 对每一个产品的 `zh.md` 执行合并前处理：
     - **按需提取图片**：解析 `zh.md` 的内容，确定其引用的图片文件名（例如 `images/media-0.png`）。
     - **按需复制并重命名**：**仅**将这些实际被引用的图片文件从原单品目录复制到 `output/producthunt-daily-output/[date]/images/`。为了防止重名，**必须**重命名为 `[rank-slug]-[filename]`（例如 `01-jupid-media-0.png`）。
     - **更新链接**：将合并到每日汇总中的 Markdown 图片链接更新为引用新的本地副本路径。
3. **内容合并**：
   - 按排名排序（依据文件夹前缀，如 `01-`, `02-`）。
   - 将处理后的产品描述内容依次合并，每个产品之间使用 `---` 分隔。
   - 顶部增加当天的汇总标题（例如：`Product Hunt 每日精选 - 2026-03-31`）。
4. **输出结果**：保存为 `output/producthunt-daily-output/[date]/index.md`。

## 视觉与审美规范
- 翻译应自然、具有科技感，避免生硬的机器翻译感。
- 使用结构化的 Markdown 使排版呈现高级感。
- 补充的“关键信息”应使用表情符号增加可读性。

## 配置参考
- **输入路径**: `../../output/producthunt-daily`
- **输出路径**: `../../output/producthunt-daily-output`
