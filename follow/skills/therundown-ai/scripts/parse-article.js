import { cleanContent } from '../../../shared/utils/content-cleaner.js';
import { formatArticle, generateSlug } from '../../../shared/utils/markdown-formatter.js';

/**
 * 解析单篇 RSS 文章，清洗并格式化
 * @param {object} article - RSS 文章数据
 * @param {string} sourceName - 来源名称
 * @returns {object} { slug, markdown, meta }
 */
export function parseArticle(article, sourceName = 'The Rundown AI') {
  // 解析日期
  const pubDate = new Date(article.pubDate);
  const dateStr = pubDate.toISOString().slice(0, 10);

  // 提取主标题（通常是第一个新闻的标题）
  const title = article.title || 'Untitled';

  // 清洗 HTML 内容
  const cleaned = cleanContent(article.content);

  // 生成文件名
  const slug = generateSlug(title, dateStr);

  // 格式化为 Markdown
  const markdown = formatArticle({
    title,
    date: dateStr,
    source: sourceName,
    url: article.link || '',
    sections: cleaned.sections,
    quickHits: cleaned.quickHits,
    communityWorkflow: cleaned.communityWorkflow,
  });

  return {
    slug,
    markdown,
    meta: {
      title,
      date: dateStr,
      url: article.link,
      sectionsCount: cleaned.sections.length,
    },
  };
}
