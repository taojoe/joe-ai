# Shawn Math 🎓

Shawn 数学学习工具集 —— 一系列独立的数学学习 skills。

## 技术栈

- **运行环境**: Node.js
- **包管理**: bun
- **数学公式**: KaTeX (服务端渲染)
- **PDF 生成**: Puppeteer (headless Chrome)

## 项目结构

```
shawn-math/
├── skills/              # 各个独立的 skill
│   └── math-print-quiz/ # 数学知识 + 小测验打印
│       ├── SKILL.md     # skill 说明
│       ├── index.js     # 主入口
│       ├── template.js  # HTML 模板
│       ├── styles.css   # A4 打印样式
│       └── data/        # JSON 数据文件
├── output/              # 生成的输出文件 (git ignored)
│   └── math-print-quiz/ # 各 skill 的输出
├── package.json
└── README.md
```

## 使用方法

### 安装依赖

```bash
bun install
```

### 生成数学练习 PDF

```bash
# 生成指定知识点的练习
bun run quiz -- difference-of-squares

# 输出文件位于 output/math-print-quiz/
```

## 添加新 Skill

1. 在 `skills/` 下创建新目录
2. 添加 `SKILL.md` 说明文档
3. 在 `package.json` 中添加对应的 script
4. 输出统一放在 `output/{skill-name}/` 下
