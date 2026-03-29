import { parseFeed } from '../../../shared/utils/rss-parser.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * 从 The Rundown AI RSS 获取文章列表
 * @param {object} options
 * @param {number} options.limit - 限制返回数量
 * @returns {Promise<{meta: object, articles: Array}>}
 */
export async function fetchArticles(options = {}) {
  return parseFeed(config.source.url, options);
}
