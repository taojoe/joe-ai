import { cleanRedditContent, extractAuthor } from '../utils/content-cleaner.js';

/**
 * 解析和格式化单个 Reddit 帖子数据
 * @param {object} articleData - 包含 rawItem 和 feedInfo 的对象
 * @returns {object} 供 markdown stringifier 使用的格式化对象
 */
export function parseArticle({ rawItem, feedInfo }) {
  const contentHtml = rawItem.content || '';
  
  // 使用 content-cleaner 清洗 HTML 标签，提取纯文本
  const cleanedContent = cleanRedditContent(contentHtml);
  
  // 提取作者
  // Reddit RSS feed 的 item author 通常形如 "/u/username"
  // 这里也提供降级: 从 HTML 内部提取
  let authorName = rawItem.creator || extractAuthor(contentHtml);
  if (authorName.startsWith('/u/')) {
    authorName = authorName.replace('/u/', '');
  }

  // 日期格式化为 YYYY-MM-DD
  let dateStr = '';
  try {
    const pubDate = new Date(rawItem.pubDate);
    dateStr = pubDate.toISOString().split('T')[0];
  } catch (e) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  return {
    title: rawItem.title,
    date: dateStr,
    author: authorName,
    subreddit: feedInfo.subreddit,
    category: feedInfo.category,
    url: rawItem.link,
    content: cleanedContent
  };
}
