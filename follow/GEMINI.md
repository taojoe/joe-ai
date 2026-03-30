# Follow: Agent Skills for Information Sourcing

## 项目核心目的

`joe-ai/follow` 项目的核心目的是构建一套 Agent Skills 集合，专门用于从各种分散的信息源（例如 newsletter、RSS 订阅、社交平台等）抓取和采集高质量内容。它的设计具有高度的可扩展性和模块化，旨在自动化信息的收集、广告清洗和归档，最终并输出成系统化、结构良好、便于后续 AI agents 消费和检索分析的本地化数据集（Markdown 格式文件）。

## 项目架构与设计思路

该项目利用 Node.js / Bun 作为运行环境，按 "共享底层工具链" 与 "独立技能栈" 相分离的原则构建。目前主要的运行规范如下：

1. **共享工作流模块 (`shared/`)**:
   所有 Agent Skill 可共同复用的核心能力，如解析各种平台格式、清洗污染文本的 DOM 分析器、确保文件格式和结构一致的生成工具。
2. **独立技能工作空间 (`skills/`)**:
   每个外部数据源对应的抓取、过滤业务逻辑互不干扰，相互隔离，每个 Skill 都必须带有配置与专门处理该站点的抓取器。
3. **统一汇集输出 (`output/`)**:
   所有 Skill 的清理产物被统一汇总输出至全局级别的 `output/` 文件夹下，按各数据源分组落盘。

## 目录结构说明

```
follow/
├── README.md                          # 用户说明与快速使用手册
├── GEMINI.md                          # 当前 AI 上下文说明，记录项目目标、架构设计与架构原则
├── package.json                       # Node/Bun 项目环境配置和主要依赖
├── .gitignore                         
│
├── shared/                            # 全局的共享能力及工具模块库
│   └── utils/
│       ├── content-cleaner.js         # 基于 cheerio，过滤广告块、订阅链接等杂讯并重构新闻内容的引擎
│       ├── file-manager.js            # 管理存取路径分配、判定防重抓取等涉及本地 I/O 的方法
│       ├── logger.js                  # 提供了有颜色提示的简易日志管理
│       ├── markdown-formatter.js      # 使用 Handlebars 按指定骨架（加入 Frontmatter/段落）构建出统一结构 .md 文本的生成器
│       └── rss-parser.js              # 对开源库的进一步包装，专门对外提供针对 RSS 请求与解析的方法
│
├── skills/                            # Agent Skills 的集合目录
│   └── therundown-ai/                 # （例牌 Skill）针对 The Rundown AI RSS 源的抓包器
│       ├── SKILL.md                   # 该 Skill 的特有逻辑说明：清洗细节、数据源地址、更新频次及输出案例
│       ├── config.json                # 指定了目标 URL 以及匹配/排除的 CSS 字串或标题标识符，输出目录重定向(`../../output/therundown-ai`)
│       └── scripts/                   # 该 Skill 特定的业务执行脚本（请求 → 清洗重构 → 输出）
│           ├── fetch-articles.js      # 依据配置的来源拉取源格式数据
│           ├── parse-article.js       # 使用 shared utils 解析清洗并组织内容
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
