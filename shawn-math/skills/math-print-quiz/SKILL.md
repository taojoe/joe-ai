---
name: math-print-quiz
description: 生成 A4 可打印的数学知识 + 小测验 PDF
---

# Math Print Quiz

生成包含数学知识讲解和练习题的 A4 可打印 PDF。

## 功能

- **第 1 页**: 知识讲解（≤ 1/3 版面）+ 练习题（≈ 2/3 版面）
- **第 2 页**: 答案与详细解析

## 支持的题目类型

1. **选择题** (multiple-choice) — 带 A/B/C/D 选项
2. **简答题** (short-answer) — 题目 + 留白答题区域
3. **画图题** (drawing) — 题目说明 + 坐标系/网格

## 数据格式

每份练习对应一个 JSON 文件，存放在 `data/` 目录下。

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 知识点中文标题 |
| `subtitle` | string | 英文副标题 |
| `knowledge.description` | string | 知识说明 (支持 LaTeX: `$...$`) |
| `knowledge.formulas` | string[] | 核心公式 (LaTeX) |
| `knowledge.keyPoints` | string[] | 关键要点 |
| `questions[].type` | string | `multiple-choice` / `short-answer` / `drawing` |
| `questions[].question` | string | 题目内容 (支持 LaTeX) |
| `questions[].options` | string[] | 选项 (仅选择题) |
| `questions[].hint` | string | 提示信息 |
| `questions[].answer` | string | 正确答案 |
| `questions[].explanation` | string | 解题过程 (支持 LaTeX) |

## 使用方法

```bash
bun run quiz -- <json-file-name>
# 例: bun run quiz -- difference-of-squares
```

输出: `output/math-print-quiz/<json-file-name>.pdf`
