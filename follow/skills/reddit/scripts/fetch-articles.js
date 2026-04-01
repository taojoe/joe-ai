import { parseFeed } from '../utils/rss-parser.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * 检查内容是否包含排除的关键词
 */
function hasExcludedKeywords(text) {
  if (!text) return false;
  const { excludeKeywords } = config.filtering;
  const lowercaseText = text.toLowerCase();
  
  return excludeKeywords.some(keyword => lowercaseText.includes(keyword.toLowerCase()));
}

/**
 * 从不同版块获取 Reddit 帖子并过滤
 * @param {number} limitPerFeed 每个 Feed 的限制数量
 */
export async function fetchArticles(limitPerFeed) {
  const allPosts = [];
  const seenUrls = new Set();
  
  const { feeds } = config;

  for (const feed of feeds) {
    try {
      const { articles } = await parseFeed(feed.url, { limit: limitPerFeed * 3 || 30 }); // Fetch more to allow for filtering
      
      let addedInFeed = 0;

      for (const item of articles) {
        // 如果达到单个版块的限制，进行下一个版块
        if (limitPerFeed && addedInFeed >= limitPerFeed) {
          break;
        }

        const url = item.link;
        if (seenUrls.has(url)) continue;
        
        const title = item.title;
        // 过滤包含排除关键词的帖子
        if (hasExcludedKeywords(title) || hasExcludedKeywords(item.content)) {
          console.log(`[Reddit] Filtered out post due to exclude keywords: ${title}`);
          continue;
        }

        seenUrls.add(url);
        
        allPosts.push({
          rawItem: item,
          feedInfo: feed
        });
        
        addedInFeed++;
      }
    } catch (error) {
      console.error(`[Reddit] Failed to fetch feed for r/${feed.subreddit}: ${error.message}`);
    }
  }

  return allPosts;
}
