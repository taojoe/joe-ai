import * as cheerio from 'cheerio';
import { logger } from './logger.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FETCH_DELAY_MS = 300;

/**
 * HTTP GET 获取页面 HTML
 * @param {string} url - 目标 URL
 * @param {object} options
 * @param {number} options.retries - 重试次数（默认 2）
 * @param {number} options.timeout - 超时毫秒（默认 15000）
 * @returns {Promise<string>} HTML 字符串
 */
export async function fetchHtml(url, options = {}) {
  const { retries = 2, timeout = 15000 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt < retries) {
        logger.warn(`Fetch failed (attempt ${attempt + 1}/${retries + 1}): ${url} — ${error.message}`);
        await sleep(1000 * (attempt + 1));
      } else {
        throw error;
      }
    }
  }
}

/**
 * 从 Beehiiv 架构的 newsletter 首页/archive 页面提取文章列表
 * @param {string} baseUrl - 网站根地址 (如 https://www.superhuman.ai)
 * @param {object} options
 * @param {number} options.page - 页码（默认 1 = 首页）
 * @returns {Promise<Array<{title: string, date: string, url: string, slug: string}>>}
 */
export async function scrapePostListings(baseUrl, options = {}) {
  const { page = 1 } = options;
  const url = page === 1 ? baseUrl : `${baseUrl}/archive?page=${page}`;

  logger.info(`Fetching listings from: ${url}`);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const seen = new Set();
  const listings = [];

  $('a[href^="/p/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || !href.startsWith('/p/') || seen.has(href)) return;
    seen.add(href);

    const slug = href.slice(3); // 去掉前导 "/p/"
    const postUrl = `${baseUrl}${href}`;

    // 卡片容器在 a 的上两层 (a > div.relative > div.card)
    const $card = $(el).parent().parent();

    // 标题：优先 h2，回退到 img alt，最后用 slug
    const title =
      $card.find('h2').first().text().trim() ||
      $card.find('img').first().attr('alt')?.trim() ||
      slug.replace(/-/g, ' ');

    // 日期：卡片中第一个 span 的文本
    const rawDate = $card.find('span').first().text().trim() || '';

    listings.push({ title, date: rawDate, url: postUrl, slug });
  });

  return listings;
}

/**
 * 收集指定数量的文章列表（跨页翻页）
 * @param {string} baseUrl - 网站根地址
 * @param {number} count - 需要的文章数量
 * @returns {Promise<Array>}
 */
export async function collectListings(baseUrl, count) {
  const all = [];
  let page = 1;

  while (all.length < count) {
    const batch = await scrapePostListings(baseUrl, { page });
    if (batch.length === 0) break;

    all.push(...batch);
    if (all.length >= count) break;

    page++;
    await sleep(FETCH_DELAY_MS);
  }

  return all.slice(0, count);
}

/**
 * 从页面 HTML 提取 JSON-LD 结构化元数据
 * @param {string} html - 页面 HTML
 * @returns {object} 提取的元数据 { title, datePublished, author, description, featuredImage }
 */
export function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const meta = {
    title: '',
    datePublished: '',
    author: '',
    description: '',
    featuredImage: '',
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data.headline) meta.title = data.headline;
      if (data.datePublished) {
        meta.datePublished = new Date(data.datePublished).toISOString().slice(0, 10);
      }
      if (data.author?.name) meta.author = data.author.name;
      if (data.description) meta.description = data.description;
      if (data.image?.url) meta.featuredImage = data.image.url;
    } catch {
      // 忽略格式不正确的 JSON-LD
    }
  });

  // 回退到 OG meta 标签
  if (!meta.title) {
    meta.title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || '';
  }
  if (!meta.description) {
    meta.description = $('meta[property="og:description"]').attr('content') || '';
  }
  if (!meta.featuredImage) {
    meta.featuredImage = $('meta[property="og:image"]').attr('content') || '';
  }

  return meta;
}

/**
 * 从文章页面提取正文 HTML（Beehiiv 通用）
 * @param {string} html - 页面 HTML
 * @returns {string} 正文区域的 HTML 片段
 */
export function extractContentHtml(html) {
  const $ = cheerio.load(html);

  // Beehiiv 的文章正文在 #content-blocks 中
  let $content = $('#content-blocks');
  if (!$content.length) $content = $('.rendered-post');
  if (!$content.length) $content = $('main');
  if (!$content.length) $content = $('body');

  // 移除噪音元素
  const noiseSelectors = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer',
    'form', 'button',
    '[class*="subscribe"]', '[class*="share"]', '[class*="follow"]',
    '[class*="feedback"]', '[class*="poll"]', '.advertisement',
  ];
  noiseSelectors.forEach((sel) => $content.find(sel).remove());

  return $content.html() || '';
}

/**
 * 延迟指定毫秒
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
