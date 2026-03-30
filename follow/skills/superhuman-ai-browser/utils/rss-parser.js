import RSSParser from 'rss-parser';
import { logger } from './logger.js';

const parser = new RSSParser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Follow-Agent-Skills/1.0',
  },
});

/**
 * 从 RSS URL 获取并解析 Feed
 * @param {string} url - RSS Feed URL
 * @param {object} options - 可选配置
 * @param {number} options.limit - 限制返回文章数量
 * @returns {Promise<{meta: object, articles: Array}>}
 */
export async function parseFeed(url, options = {}) {
  const { limit } = options;

  logger.info(`Fetching RSS feed: ${url}`);

  try {
    const feed = await parser.parseURL(url);

    const meta = {
      title: feed.title,
      description: feed.description,
      link: feed.link,
      lastBuildDate: feed.lastBuildDate,
    };

    let articles = feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || '',
      creator: item.creator || item['dc:creator'] || '',
      content: item['content:encoded'] || item.content || item.contentSnippet || '',
      categories: item.categories || [],
      guid: item.guid || item.link || '',
    }));

    if (limit && limit > 0) {
      articles = articles.slice(0, limit);
    }

    logger.success(`Fetched ${articles.length} articles from "${meta.title}"`);

    return { meta, articles };
  } catch (error) {
    logger.error(`Failed to fetch RSS feed: ${error.message}`);
    throw error;
  }
}
