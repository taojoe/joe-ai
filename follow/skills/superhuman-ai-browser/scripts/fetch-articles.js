import { collectListings } from '../utils/web-scraper.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * 从 Superhuman AI 网站获取文章列表
 * @param {object} options
 * @param {number} options.limit - 限制返回数量（默认 10）
 * @returns {Promise<Array<{title: string, date: string, url: string, slug: string}>>}
 */
export async function fetchArticles(options = {}) {
  const { limit = 10 } = options;
  return collectListings(config.source.url, limit);
}
