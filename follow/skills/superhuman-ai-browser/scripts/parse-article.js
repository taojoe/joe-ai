import { fetchHtml, extractJsonLd, extractContentHtml, sleep } from '../utils/web-scraper.js';
import { formatArticle, generateSlug } from '../utils/markdown-formatter.js';
import { logger } from '../utils/logger.js';
import * as cheerio from 'cheerio';

/**
 * Superhuman AI 赞助/广告模式
 */
const SPONSOR_PATTERNS = [
  /presented\s+by/i,
  /sponsored\s+by/i,
  /advertisement/i,
];

/**
 * 需要移除的 newsletter 模板内容
 */
const TEMPLATE_PATTERNS = [
  /Whenever you're ready to take the next step/i,
  /What did you think of today's email/i,
  /Share this newsletter/i,
  /Welcome back,\s*Superhuman/i,
  /Which one is AI generated/i,
];

/**
 * 解析单篇 Superhuman AI 文章页面，清洗并格式化
 * @param {object} listing - 文章列表项 { title, date, url, slug }
 * @param {string} sourceName - 来源名称
 * @returns {Promise<{slug: string, markdown: string, meta: object}>}
 */
export async function parseArticle(listing, sourceName = 'Superhuman AI') {
  logger.info(`Fetching post: ${listing.url}`);
  const html = await fetchHtml(listing.url);

  // 从 JSON-LD / OG 标签提取元数据
  const jsonLd = extractJsonLd(html);

  const title = jsonLd.title || listing.title || 'Untitled';
  const dateStr = jsonLd.datePublished || parseFuzzyDate(listing.date);
  const author = jsonLd.author || 'Zain Kahn';

  // 提取正文 HTML
  const contentHtml = extractContentHtml(html);

  // 使用 Superhuman AI 专用解析器清洗内容
  const cleaned = cleanSuperhumanContent(contentHtml);

  // 生成文件名
  const slug = generateSlug(title, dateStr);

  // 格式化为 Markdown
  const markdown = formatArticle({
    title,
    date: dateStr,
    source: sourceName,
    url: listing.url,
    sections: cleaned.sections,
    quickHits: cleaned.quickHits,
    communityWorkflow: '',
  });

  return {
    slug,
    markdown,
    meta: {
      title,
      date: dateStr,
      author,
      url: listing.url,
      sectionsCount: cleaned.sections.length,
    },
  };
}

/**
 * Superhuman AI 专用内容清洗器
 *
 * Superhuman AI 的 HTML 结构：
 * - h5: 分类标题 (TODAY IN AI, FROM THE FRONTIER, THE AI ACADEMY 等)
 * - h2: 新闻标题
 * - p: 正文段落
 * - h5 + "PRESENTED BY": 赞助区块
 *
 * @param {string} html - #content-blocks 内的 HTML
 * @returns {object} { sections, quickHits }
 */
function cleanSuperhumanContent(html) {
  if (!html) return { sections: [], quickHits: [] };

  const $ = cheerio.load(html, { decodeEntities: true });

  // 移除 style 和 script 标签
  $('style, script').remove();

  const sections = [];
  const quickHits = [];

  let currentSection = null;
  let skipSection = false;

  // 遍历内容块中的关键元素
  // Superhuman AI 的分类标题在工作日使用 h5，周日特刊使用 h4
  const elements = $('h4, h5, h2, h3, p:not(li p), ul, ol').toArray();

  for (const el of elements) {
    const $el = $(el);
    const text = $el.text().trim();

    if (!text) continue;

    // 检查是否是模板内容，直接跳过
    if (TEMPLATE_PATTERNS.some((p) => p.test(text))) continue;

    // 处理 h4/h5 — 分类标题或赞助区块标识
    // 工作日 newsletter 使用 h5，Sunday Special 使用 h4
    const isCategoryHeading =
      $el.is('h4') || $el.is('h5') ||
      $el.find('h4').length > 0 || $el.find('h5').length > 0;

    if (isCategoryHeading) {
      const sectionTitle = (
        $el.find('h5').first().text() ||
        $el.find('h4').first().text() ||
        text
      ).trim();

      // 赞助区块检测
      if (SPONSOR_PATTERNS.some((p) => p.test(sectionTitle))) {
        skipSection = true;
        continue;
      }

      skipSection = false;

      // 特殊区块：工具/trending 处理为 quickHits
      if (/trending\s+ai\s+tools/i.test(sectionTitle) || /productivity/i.test(sectionTitle)) {
        currentSection = { type: 'quickhits' };
        continue;
      }

      // 特殊区块：PROMPT STATION、FRIDAY FUN、TRIVIA 等不需要深度解析的内容
      if (/prompt\s+station/i.test(sectionTitle) || /friday\s+fun/i.test(sectionTitle) || /trivia/i.test(sectionTitle)) {
        currentSection = { type: 'misc' };
        continue;
      }

      // 普通新闻分类
      currentSection = {
        type: 'news',
        category: sectionTitle.toUpperCase(),
        title: '',
        emoji: '',
        content: [],
        link: '',
      };
      sections.push(currentSection);
      continue;
    }

    if (skipSection) continue;

    // 处理 h2 — 新闻标题
    if ($el.is('h2') || $el.find('h2').length > 0) {
      const titleText = ($el.find('h2').first().text() || text).trim();

      if (currentSection && currentSection.type === 'news' && !currentSection.title) {
        // 提取 emoji 和标题
        const emojiMatch = titleText.match(/^([^\w\s])\s*(.+)/u);
        if (emojiMatch) {
          currentSection.emoji = emojiMatch[1];
          currentSection.title = emojiMatch[2];
        } else {
          currentSection.title = titleText;
        }

        // 提取链接
        const link = ($el.find('h2').length > 0 ? $el.find('h2') : $el).find('a').first();
        if (link.length > 0) {
          currentSection.link = cleanUrl(link.attr('href'));
        }
      }
      continue;
    }

    // 处理 h3 — 子标题（通常是互动内容、CTA）
    if ($el.is('h3')) {
      // 大部分 h3 是 CTA 或互动内容，跳过
      if (TEMPLATE_PATTERNS.some((p) => p.test(text))) continue;
      // 如果在 misc 区块中，跳过
      if (currentSection && currentSection.type === 'misc') continue;
      continue;
    }

    // 处理内容段落
    if (currentSection) {
      if (currentSection.type === 'quickhits') {
        const contentText = extractParagraphText($el, $);
        if (contentText && contentText !== '---' && !isDuplicateContent(contentText, quickHits)) {
          quickHits.push(contentText);
        }
      } else if (currentSection.type === 'news') {
        const contentText = extractParagraphText($el, $);
        if (contentText && contentText !== '---' && !isDuplicateContent(contentText, currentSection.content)) {
          currentSection.content.push(contentText);
        }
      }
      // type === 'misc' 的内容直接忽略
    }
  }

  return {
    sections: sections.filter((s) => s.title),
    quickHits: [...new Set(quickHits)],
  };
}

/**
 * 提取段落文本，保留基本格式
 */
function extractParagraphText($el, $) {
  // 将 <br> 转为换行
  $el.find('br').replaceWith('\n');

  // 将链接转为 Markdown 格式
  $el.find('a').each((_, a) => {
    const $a = $(a);
    const href = cleanUrl($a.attr('href'));
    const text = $a.text().trim();
    if (text && href) {
      $a.replaceWith(`[${text}](${href})`);
    }
  });

  // 处理粗体
  $el.find('strong, b').each((_, el) => {
    const $b = $(el);
    $b.replaceWith(`**${$b.text()}**`);
  });

  // 处理列表
  const listItems = [];
  $el.find('li').each((_, li) => {
    listItems.push(`- ${$(li).text().trim()}`);
  });
  if (listItems.length > 0) {
    return listItems.join('\n');
  }

  return $el.text().trim();
}

/**
 * 清理 URL（移除 UTM 参数）
 */
function cleanUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_')) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * 判断内容是否重复
 */
function isDuplicateContent(text, contents) {
  return contents.some((existing) => {
    if (existing === text) return true;
    if (existing.includes(text) || text.includes(existing)) return true;
    return false;
  });
}

/**
 * 尝试将模糊日期字符串解析为 YYYY-MM-DD
 */
function parseFuzzyDate(rawDate) {
  if (!rawDate) return new Date().toISOString().slice(0, 10);

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const agoMatch = rawDate.match(/(\d+)\s+(hour|day|minute|week)s?\s+ago/i);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2].toLowerCase();
    const now = new Date();
    switch (unit) {
      case 'minute': now.setMinutes(now.getMinutes() - amount); break;
      case 'hour': now.setHours(now.getHours() - amount); break;
      case 'day': now.setDate(now.getDate() - amount); break;
      case 'week': now.setDate(now.getDate() - amount * 7); break;
    }
    return now.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}
