import { parseFeed } from '../utils/rss-parser.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

/**
 * 严格的正向过滤逻辑：校验标题中是否包含特定的 AI/LLM 关键词（单词边界）
 */
function matchesKeywordsStrictly(title) {
  const { keywords } = config.filtering;
  
  // 1. 缩写词：强制大写且单词边界 (AI, LLM, GPT, RAG)
  const acronyms = keywords.filter(k => k.length <= 3 && k === k.toUpperCase());
  const acronymRegex = new RegExp(`\\b(${acronyms.join('|')})\\b`, 'u');
  if (acronymRegex.test(title)) return true;

  // 2. 普通词：不区分大小写但要求单词边界 (Agent, Transformer, Claude)
  const commonTerms = keywords.filter(k => k.length > 3 || k !== k.toUpperCase());
  const commonRegex = new RegExp(`\\b(${commonTerms.join('|')})\\b`, 'iu');
  if (commonRegex.test(title)) return true;

  return false;
}

/**
 * 域名分类校验
 */
function getDomainCategory(url) {
  if (!url) return 'other';
  
  // 核心 AI/ML 厂商或垂直平台（高置信度，几乎 100% 相关）
  const coreAiDomains = [
    'openai.com', 'anthropic.com', 'mistral.ai', 'deepmind.com', 
    'perplexity.ai', 'cohere.com', 'huggingface.co'
  ];
  
  // 通用技术/学术平台（需要配合关键词过滤）
  const techPlatforms = ['github.com', 'arxiv.org'];

  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    if (coreAiDomains.some(d => domain === d || domain.endsWith('.' + d))) {
      return 'core-ai';
    }
    if (techPlatforms.some(d => domain === d || domain.endsWith('.' + d))) {
      return 'tech-platform';
    }
  } catch {
    return 'other';
  }
  return 'other';
}

/**
 * 从多个 HN RSS 源获取并过滤文章
 */
export async function fetchArticles() {
  const allStories = [];
  const seenGuids = new Set();
  
  const { feeds } = config.source;

  for (const feedUrl of feeds) {
    try {
      const { articles } = await parseFeed(feedUrl);
      
      for (const item of articles) {
        if (seenGuids.has(item.guid)) continue;
        seenGuids.add(item.guid);

        const title = item.title;
        const link = item.link;
        const domainCat = getDomainCategory(link);
        const hasKeywords = matchesKeywordsStrictly(title);

        let finalMatch = false;
        let matchReason = '';

        if (domainCat === 'core-ai') {
          // A. 核心 AI 域名：直接通过（或如果有关键字更佳）
          finalMatch = true;
          matchReason = 'Core AI Domain';
        } else if (domainCat === 'tech-platform' && hasKeywords) {
          // B. 通用平台 (GitHub/Arxiv)：必须带关键字
          finalMatch = true;
          matchReason = 'Tech Platform + Keyword';
        } else if (hasKeywords) {
          // C. 其他来源 (Show HN 等)：必须带严格关键字匹配
          finalMatch = true;
          matchReason = 'Keyword Match (Strict)';
        }

        if (finalMatch) {
          allStories.push({
            id: extractIdFromGuid(item.guid) || Date.now().toString(),
            title: title,
            url: link,
            points: extractPoints(item.content),
            author: extractAuthor(item.content),
            createdAt: item.pubDate,
            numComments: extractCommentCount(item.content),
            discussionUrl: item.link.includes('news.ycombinator.com') ? item.link : `https://news.ycombinator.com/item?id=${extractIdFromGuid(item.guid)}`,
            sourceType: matchReason,
            matchedKeyword: hasKeywords ? getMatchedKeyword(title) : ''
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch feed ${feedUrl}: ${error.message}`);
    }
  }

  return allStories;
}

function getMatchedKeyword(title) {
  const { keywords } = config.filtering;
  const acronyms = keywords.filter(k => k.length <= 3 && k === k.toUpperCase());
  const commonTerms = keywords.filter(k => k.length > 3 || k !== k.toUpperCase());

  for (const k of acronyms) {
    if (new RegExp(`\\b${k}\\b`, 'u').test(title)) return k;
  }
  for (const k of commonTerms) {
    if (new RegExp(`\\b${k}\\b`, 'iu').test(title)) return k;
  }
  return '';
}

function extractIdFromGuid(guid) {
  return guid.split('=')[1];
}

function extractPoints(content) {
  const match = content.match(/Points: (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractAuthor(content) {
  const match = content.match(/Author: (\w+)/);
  return match ? match[1] : '';
}

function extractCommentCount(content) {
  const match = content.match(/Comments: (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
