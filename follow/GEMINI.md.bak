# Follow: Agent Skills for Information Sourcing

## 项目核心目的

`joe-ai/follow` 项目的核心目的是构建一套 Agent Skills 集合，专门用于从各种分散的信息源（例如 newsletter、RSS 订阅、社交平台等）抓取和采集高质量内容。它的设计具有高度的可扩展性和模块化，旨在自动化信息的收集、广告清洗和归档，最终并输出成系统化、结构良好、便于后续 AI agents 消费和检索分析的本地化数据集（Markdown 格式文件）。

## 项目架构与设计思路

该项目利用 Node.js / Bun 作为运行环境，按 "完全独立的技能栈" 原则构建。目前主要的运行规范如下：

1. **完全独立的技能工作空间 (`skills/`)**:
   每个外部数据源对应的抓取、过滤业务逻辑互不干扰，相互隔离。除了专用的抓取器脚本外，每个 Skill 内部都独立拥有一份自己所需的辅助工具集（如 `utils/`），确保各项目可以单独维护、灵活配置、互不影响。
2. **统一汇集输出 (`output/`)**:
   所有 Skill 的清理产物被统一汇总输出至全局级别的 `output/` 文件夹下，按各数据源分组落盘。

## 目录结构说明

```
follow/
├── README.md                          # 用户说明与快速使用手册
├── GEMINI.md                          # 当前 AI 上下文说明，记录项目目标、架构设计与架构原则
├── package.json                       # Node/Bun 项目环境配置和主要依赖
├── .gitignore                         
│
├── skills/                            # Agent Skills 的集合目录
│   └── therundown-ai/                 # （例牌 Skill）针对 The Rundown AI RSS 源的抓包器
│       ├── SKILL.md                   # 该 Skill 的特有逻辑说明：清洗细节、数据源地址、更新频次及输出案例
│       ├── config.json                # 指定了目标 URL 以及匹配/排除的 CSS 字串或标题标识符，输出目录重定向(`../../output/therundown-ai`)
│       ├── utils/                     # 该 Skill 的内部独立工具链，如内容清洗器、文件管理器等
│       └── scripts/                   # 该 Skill 特定的业务执行脚本（请求 → 清洗重构 → 输出）
│           ├── fetch-articles.js      # 依据配置的来源拉取源格式数据
│           ├── parse-article.js       # 使用内部 utils 解析清洗并组织内容
│           └── run.js                 # 实际执行总控入口文件，编排执行顺序且实现限制、排重
│
└── output/                            # 全局产物目录，.gitignore 已包含，存放真正的抓取成果
    └── therundown-ai/                 # 产出的带 YAML 元数据的 markdown 集，由对应 skill 中的 config 设定路由输出
        ├── 2026-03-29-xxxxxx.md       # ...最终格式化并清洗完毕的文章内容
        └── ...
```

## 技术栈

- 运行与包管理环境：Bun (Node.js ESM)
- 主体请求与解析：`rss-parser`
- 结构与内容脱敏：`cheerio`
- 文件骨架及输出构建：`handlebars`
