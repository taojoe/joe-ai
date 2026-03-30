import * as cheerio from 'cheerio';

/**
 * 赞助/广告区块的标识模式
 * 匹配 "TOGETHER WITH"、"PRESENTED BY" 等赞助标题
 */
const SPONSOR_PATTERNS = [
  /together\s+with/i,
  /presented\s+by/i,
  /sponsored\s+listing/i,
  /sponsored/i,
];

/**
 * 需要移除的 newsletter 模板内容
 */
const TEMPLATE_PATTERNS = [
  /Read Online/i,
  /Sign Up/i,
  /Good morning,\s*\{\{/i,
  /See you soon,/i,
  /the humans behind The Rundown/i,
];

/**
 * 清洗 HTML 内容
 * @param {string} html - 原始 HTML 内容
 * @param {object} options - 清洗选项
 * @param {string[]} options.removeSections - 额外需要移除的 section 标题关键词
 * @returns {object} 清洗后的结构化内容
 */
export function cleanContent(html, options = {}) {
  if (!html) return { sections: [], quickHits: [], communityWorkflow: '' };

  const $ = cheerio.load(html, { decodeEntities: true });

  // 移除 style 和 script 标签
  $('style, script').remove();

  // 提取结构化内容
  const sections = [];
  const quickHits = [];
  let communityWorkflow = '';

  // 遍历所有内容块
  let currentSection = null;
  let skipSection = false;

  // 所有关键内容节点，按顺序排列（排除 li 里面的 p，因为 ul 会一次性处理）
  const elements = $('h6, h4, h3, ul, p:not(li p)').toArray();

  for (const el of elements) {
    const $el = $(el);
    const text = $el.text().trim();

    if (!text) continue;

    // 检查是否是赞助内容
    if (isSponsorContent($el, $)) {
      skipSection = true;
      continue;
    }

    // 检查是否是新的新闻 section（h6 常是分类标题，h3 常是 Quick Hits/Community 标题）
    const h6 = $el.find('h6').first();
    const h3 = $el.find('h3').first();
    if (h6.length > 0 || h3.length > 0 || $el.is('h6') || $el.is('h3')) {
      const sectionTitle = (h6.length > 0 ? h6.text() : h3.length > 0 ? h3.text() : text).trim();

      // 如果是赞助区块，跳过
      if (SPONSOR_PATTERNS.some((p) => p.test(sectionTitle))) {
        skipSection = true;
        continue;
      }

      skipSection = false;

      // 特殊区块处理
      if (/QUICK HITS/i.test(sectionTitle) || /Trending AI Tools/i.test(sectionTitle) || /Everything else/i.test(sectionTitle)) {
        currentSection = { type: 'quickhits' };
        continue;
      }
      if (/COMMUNITY/i.test(sectionTitle) || /Community AI workflows/i.test(sectionTitle)) {
        currentSection = { type: 'community' };
        continue;
      }

      // 如果是 h3 但不是上面那些，有可能是其它杂项，或者是某些小标题，先忽略创建新 section
      if ($el.is('h3') || h3.length > 0) continue;

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

    // 过滤掉文中的裸露 QUICK HITS 等标签
    if (/^QUICK HITS$/i.test(text) || /^COMMUNITY$/i.test(text)) continue;

    // 检查是否是模板内容
    if (TEMPLATE_PATTERNS.some((p) => p.test(text))) continue;

    // 处理 h4 标题（新闻标题）
    const h4 = $el.find('h4').first();
    if (h4.length > 0 || $el.is('h4')) {
      const titleText = (h4.length > 0 ? h4.text() : text).trim();
      if (currentSection && currentSection.type === 'news') {
        // 提取 emoji 和标题
        const emojiMatch = titleText.match(/^([^\w\s])\s*(.+)/u);
        if (emojiMatch) {
          currentSection.emoji = emojiMatch[1];
          currentSection.title = emojiMatch[2];
        } else {
          currentSection.title = titleText;
        }
        // 提取链接
        const link = (h4.length > 0 ? h4 : $el).find('a').first();
        if (link.length > 0) {
          currentSection.link = cleanUrl(link.attr('href'));
        }
      }
      continue;
    }

    // 处理内容段落
    if (currentSection) {
      if (currentSection.type === 'quickhits') {
        const contentText = extractParagraphText($el, $);
        if (contentText && contentText !== '---' && !isDuplicateContent(contentText, quickHits)) {
          // 过滤掉只有 "Everything else in AI today" 或 "Trending AI Tools" 这样的小标题
          if (!/^(Everything else in AI today|Trending AI Tools)$/i.test(contentText.replace(/[\*\[\]]/g, '').trim())) {
            quickHits.push(contentText);
          }
        }
      } else if (currentSection.type === 'community') {
        if (text && !/Community AI workflows/i.test(text) && !/How do you use AI/i.test(text)) {
          communityWorkflow += text + '\n';
        }
      } else if (currentSection.type === 'news') {
        // 过滤掉重复的内容（Beehiiv RSS 会重复 bullet points）
  // 过滤掉重复的内容（并且忽略空白行或分割线）
        const contentText = extractParagraphText($el, $);
        if (contentText && contentText !== '---' && !isDuplicateContent(contentText, currentSection.content)) {
          currentSection.content.push(contentText);
        }
      }
    }
  }

  return {
    sections: sections.filter((s) => s.title),
    quickHits: [...new Set(quickHits)],
    communityWorkflow: communityWorkflow.trim(),
  };
}

/**
 * 判断元素是否为赞助内容
 */
function isSponsorContent($el, $) {
  const text = $el.text();
  return SPONSOR_PATTERNS.some((p) => p.test(text)) && (
    $el.find('h6').length > 0 ||
    $el.find('h4').length > 0 ||
    $el.is('h6') ||
    text.length < 200
  );
}

/**
 * 清理 URL（移除 UTM 参数）
 */
function cleanUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // 移除 UTM 参数
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
 * 判断是否是 newsletter 模板链接
 */
function isTemplateLink(text) {
  return /^(Read Online|Sign Up|Advertise|Subscribe|Highlights: News, Guides & Events)$/i.test(text);
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
 * 判断内容是否重复（Beehiiv RSS 常见问题）
 */
function isDuplicate(text, items) {
  return items.some((item) => item.text === text);
}

function isDuplicateContent(text, contents) {
  // 检查文本是否与已有内容有超过 80% 的重叠
  return contents.some((existing) => {
    if (existing === text) return true;
    // 如果新文本是已有内容的子串（或反过来），认为是重复
    if (existing.includes(text) || text.includes(existing)) return true;
    return false;
  });
}


