import * as cheerio from 'cheerio';

/**
 * 解析从 Atom Feed 获取的 Product Hunt 条目
 * @param {object} item - 原始 feed 条目
 * @returns {object} { slug, markdown, meta }
 */
export function parseProduct(item) {
  const $ = cheerio.load(item.content || '');
  
  // 提取产品简介 (Atom feed 中 content 的第一个 p 标签)
  const tagline = $('p').first().text().trim() || '';
  
  // 提取产品链接 (去除 UTM 参数)
  const productUrl = item.link.split('?')[0];
  
  // 生成 slug (产品名转化为小写+中划线)
  const slug = item.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')     // 空格替换为中划线
    .slice(0, 50);            // 截断

  const date = item.publishedDate ? item.publishedDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  
  const meta = {
    title: item.title,
    tagline: tagline,
    url: productUrl,
    hunter: item.author,
    published_at: date,
    source: "Product Hunt"
  };

  const markdown = `---
title: "${meta.title.replace(/"/g, '\\"')}"
tagline: "${meta.tagline.replace(/"/g, '\\"')}"
url: ${meta.url}
hunter: "${meta.hunter}"
published_at: ${meta.published_at}
source: "Product Hunt"
---

# ${meta.title}

> ${meta.tagline}

- **猎手 (Hunter)**: ${meta.hunter}
- **发布日期**: ${meta.published_at}
- **Product Hunt 链接**: [${meta.url}](${meta.url})

## 产品简述
${meta.tagline}
`;

  return { 
    slug: `${date}-${slug}`, 
    markdown, 
    meta 
  };
}
