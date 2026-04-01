import * as cheerio from 'cheerio';

/**
 * 清洗 Reddit RSS 中的 HTML 内容
 * @param {string} html - 原始 HTML
 * @returns {string} 清洗后的 Markdown 风格文本
 */
export function cleanRedditContent(html) {
  if (!html) return '';

  const $ = cheerio.load(html);

  // 1. If there's a div.md, it's likely the text post body. Try to target it.
  const mdContent = $('div.md').first();
  if (mdContent.length > 0) {
    // Replace the whole body with just this div's content
    $('body').html(mdContent.html());
  } else {
    // 2. Otherwise, it might be in a table (link post). 
    // We want to remove the thumbnail and "submitted by" but keep any text descriptions.
    // Instead of removing all tables, let's remove elements we know are noise.
    $('img').remove();
    $('a').each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes('[link]') || text.includes('[comments]') || text.includes('view comments')) {
        $(el).remove();
      }
    });
  }

  // Common noise
  $('hr').remove();

  // 3. Convert HTML to Markdown (simple treatment)
  $('p').each((i, el) => { $(el).prepend('\n').append('\n'); });
  $('br').replaceWith('\n');
  $('strong, b').each((i, el) => { $(el).wrap('**'); });
  $('em, i').each((i, el) => { $(el).wrap('_'); });
  
  // Lists
  $('ul').each((i, el) => { $(el).find('li').prepend('\n- '); });
  $('ol').each((i, el) => { $(el).find('li').prepend('\n1. '); });

  let text = $.text().trim();

  // 4. Final regex cleanup
  text = text.replace(/submitted by\s+\/u\/[^\s]+\s*/g, '');
  text = text.replace(/to\s+r\/[^\s]+\s*/g, '');
  
  // 5. Cleanup redundant whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * 从 HTML 中提取作者名
 * @param {string} html - 原始 HTML
 * @returns {string} 作者名
 */
export function extractAuthor(html) {
  if (!html) return 'anonymous';
  const $ = cheerio.load(html);
  const authorLink = $('a[href*="/user/"]').first();
  return authorLink.text().replace('/u/', '').trim() || 'anonymous';
}
