import Handlebars from 'handlebars';

/**
 * 文章 Markdown 模板
 */
const ARTICLE_TEMPLATE = `---
title: "{{title}}"
date: {{date}}
source: {{source}}
url: {{url}}
---

{{#if sections}}
## Latest Developments

{{#each sections}}
### {{emoji}} {{title}}

{{#if category}}*{{category}}*{{/if}}

{{#each content}}
{{this}}

{{/each}}
{{#if link}}🔗 [Source]({{link}}){{/if}}

---

{{/each}}
{{/if}}
{{#if quickHits}}
## Quick Hits

{{#each quickHits}}
{{this}}

{{/each}}

{{/if}}
{{#if communityWorkflow}}
## Community Workflow

{{communityWorkflow}}
{{/if}}
`;

const compiledTemplate = Handlebars.compile(ARTICLE_TEMPLATE, { noEscape: true });

/**
 * 将结构化内容格式化为 Markdown
 * @param {object} data - 文章数据
 * @param {string} data.title - 文章标题
 * @param {string} data.date - 发布日期 (YYYY-MM-DD)
 * @param {string} data.source - 来源名称
 * @param {string} data.url - 原文链接
 * @param {Array} data.sections - 新闻段落
 * @param {Array} data.quickHits - Quick Hits 列表
 * @param {string} data.communityWorkflow - 社区工作流
 * @returns {string} 格式化后的 Markdown 内容
 */
export function formatArticle(data) {
  return compiledTemplate(data).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * 从文章标题生成文件名 slug
 * @param {string} title - 文章标题
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @returns {string} 文件名 slug，如 "2026-03-28-meta-new-open-source-brain-ai"
 */
export function generateSlug(title, date) {
  const slug = title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${date}-${slug}`;
}
