# Product Hunt Daily Output (Chinese Edition)

## 目标

将 `output/producthunt-daily/[date]/[rank-slug]/index.md` 翻译成精美的中文版本 `zh.md`。

## 操作流程 (AI Agent Instructions)

### 单品原子化闭环循环 (Strict Atomic Loop for Each Product)

对 `output/producthunt-daily/[date]/` 下的所有产品目录执行**串行/逐个完成**的原子化任务。必须在完成一个产品的全部步骤后，再开始下一个产品的读取工作。

**每个产品目录执行以下 4 个步骤：**

1. **读取内容 (Foreground Read)**：读取该目录下的 `index.md`（严禁批量/提前读取或通过 list_dir 一次性查看多个文件的详细内容）。
2. **提取媒体**：
   - 封面图：优先使用 `images/media-0.png` 或 `images/media-0.jpeg`，若不存在则使用 `images/thumb.png`。
3. **内容翻译与重组**：参考模板 [examples/sample_zh.md](examples/sample_zh.md) 格式生成 `zh.md`：
   - **Frontmatter**：完整复制 `index.md` 的 Metadata，但需将其中的 `title` 和 `tagline` 翻译为中文， 增加`cover` 字段。
   - **封面图片**：显示封面图。
   - **产品名称与标语**：显示中文翻译。
   - **核心亮点**：将 `Description` 翻译成生动的中文段落。
   - **关键信息**：
     - 投票数 (Votes)
     - 官网 (Website)
     - 分类 (Topics - 翻译成中文)
     - Product Hunt 链接
4. **保存文件**：在同一目录下保存为 `zh.md`。

## 视觉与审美规范

- 翻译应自然、具有科技感，避免生硬的机器翻译感。
- 使用结构化的 Markdown 使排版呈现高级感。
- 补充的“关键信息”应使用表情符号增加可读性。
