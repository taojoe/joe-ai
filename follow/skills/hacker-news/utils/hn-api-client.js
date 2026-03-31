import { logger } from './logger.js';

/**
 * 从 HN Algolia API 搜索文章
 * @param {string} query - 搜索关键词
 * @param {object} options - 可选配置
 * @param {number} options.minPoints - 最少点赞数
 * @param {number} options.lastHours - 过去几小时内
 * @returns {Promise<Array>} 符合条件的文章列表
 */
export async function searchStories(query, options = {}) {
  const { minPoints = 0, lastHours = 24 } = options;
  
  // 计算起始时间戳（秒）
  const timestamp = Math.floor(Date.now() / 1000) - (lastHours * 3600);
  
  const url = new URL('https://hn.algolia.com/api/v1/search_by_date');
  url.searchParams.set('query', query);
  url.searchParams.set('tags', 'story');
  url.searchParams.set('numericFilters', `created_at_i>${timestamp},points>=${minPoints}`);

  logger.info(`Searching HN for "${query}" (points >= ${minPoints}, last ${lastHours}h)`);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const hits = data.hits || [];
    
    logger.success(`Found ${hits.length} matches for "${query}"`);
    
    return hits.map(hit => ({
      id: hit.objectID,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points,
      author: hit.author,
      createdAt: hit.created_at,
      numComments: hit.num_comments,
      discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      querySource: query // 记录是哪个关键词搜出来的
    }));
  } catch (error) {
    logger.error(`Failed to search HN for "${query}": ${error.message}`);
    return [];
  }
}
