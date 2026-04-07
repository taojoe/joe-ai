import Handlebars from 'handlebars';

/**
 * 文章 Markdown 模板 - 针对 Reddit 帖子优化
 */
const ARTICLE_TEMPLATE = `---
title: "{{title}}"
date: {{date}}
author: {{author}}
subreddit: {{subreddit}}
url: {{url}}
category: {{category}}
---

# {{title}}

**Author:** {{author}} | **Subreddit:** r/{{subreddit}} | **Date:** {{date}}

---

{{content}}

---
🔗 [View on Reddit]({{url}})
`;

const compiledTemplate = Handlebars.compile(ARTICLE_TEMPLATE, { noEscape: true });

/**
 * 将 Reddit 帖子内容格式化为 Markdown
 * @param {object} data - 帖子数据
 * @returns {string} 格式化后的 Markdown 内容
 */
export function formatArticle(data) {
  return compiledTemplate(data).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * 从帖子标题生成文件名 slug
 * @param {string} title - 标题
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} subreddit - 版块名
 * @returns {string} 文件名 slug
 */
export function generateSlug(title, date, subreddit) {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return `${date}-r-${subreddit.toLowerCase()}-${cleanTitle}`;
}
