import Parser from 'rss-parser';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * 从 Product Hunt Atom Feed 获取产品列表
 * @returns {Promise<Array>}
 */
export async function fetchArticles() {
  const parser = new Parser();
  
  try {
    const feed = await parser.parseURL(config.source.url);
    
    // Atom feed fields according to Product Hunt structure
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      content: item.content, // tagline HTML
      author: item.author,
      publishedDate: item.isoDate
    }));
  } catch (error) {
    throw new Error(`Failed to fetch Product Hunt feed: ${error.message}`);
  }
}
