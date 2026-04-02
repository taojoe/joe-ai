import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
// @ts-ignore - Assuming consistency with local project structure
import { getExistingDirs } from '../utils/file-manager.js';
// @ts-ignore
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.json');

if (!existsSync(configPath)) {
  logger.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

interface Config {
  displayName: string;
  output: {
    dir: string;
  }
}

const config: Config = JSON.parse(readFileSync(configPath, 'utf-8'));

// MiniMax Configuration
const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimaxi.com/v1';
const MINIMAX_TOKEN = process.env.MINIMAX_TOKEN;
const MODEL_NAME = 'MiniMax-M2.7';

if (!MINIMAX_TOKEN) {
  logger.error('MINIMAX_TOKEN is not set in environment variables.');
  process.exit(1);
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 */
function getDateString(offset: number = -1): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

/**
 * 调用 MiniMax API 进行翻译
 */
async function translateWithMiniMax(content: string, systemPrompt: string): Promise<string | null> {
  const url = `${MINIMAX_API_URL.replace(/\/$/, '')}/chat/completions`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_TOKEN}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      throw new Error(`MiniMax API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    logger.error(`Translation failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetDate = args[0] || getDateString();
  
  logger.divider();
  logger.info(`🤖 Starting LLM Translation for ${targetDate} (TypeScript)`);
  logger.divider();

  const outputRoot = join(__dirname, '..', config.output.dir);
  const dayDir = join(outputRoot, targetDate);

  if (!existsSync(dayDir)) {
    logger.error(`Directory for date ${targetDate} not found: ${dayDir}`);
    process.exit(1);
  }

  const products: string[] = getExistingDirs(dayDir).filter((name: string) => /^\d{2}-/.test(name)).sort();
  logger.info(`Found ${products.length} products to translate.`);

  const systemPrompt = `你是一个专业的科技主编和翻译家，擅长将 Product Hunt 的产品介绍翻译顺滑且具有吸引力的中文。
请参考以下规则：
1. **内容重组**：按照提供的模板格式生成 Markdown。
2. **语言风格**：自然、具有科技感，避免生硬。
3. **视觉要求**：使用结构化 Markdown 和 Emoji 增加可读性。
4. **封面图逻辑**：前端元数据的 cover 字段应指向 images/media-0.png (如果存在) 或 images/thumb.png。

**输出模板参考：**
---
id: "..."
title: "中文标题"
tagline: "中文标语"
votes: ...
url: "..."
website: "..."
date: "..."
topics: [...]
makers: [...]
is_ai: ...
cover: images/media-0.png
---

# 中文标题

> 中文标语

## 产品简介

(生动的中文描述)

## 关键信息

- 🔥 **投票数**: ...
- 🌐 **官网**: [访问网站](...)
- 🏷️ **标签**: (中文标签)
- 🛠️ **Product Hunt**: [详情页面](...)
`;

  for (const productDirName of products) {
    const productDir = join(dayDir, productDirName);
    const indexFile = join(productDir, 'index.md');
    const zhFile = join(productDir, 'zh.md');

    if (!existsSync(indexFile)) {
      logger.skip(`[MISSING index.md] ${productDirName}`);
      continue;
    }

    if (existsSync(zhFile)) {
      logger.skip(`[EXISTS zh.md] ${productDirName}`);
      continue;
    }

    logger.info(`[TRANSLATING] ${productDirName}...`);
    const content = readFileSync(indexFile, 'utf-8');
    
    const translated = await translateWithMiniMax(content, systemPrompt);
    
    if (translated) {
        let cleanContent = translated.trim();
        
        // Remove <think> blocks if present
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>\n*/g, '');
        
        // Clean up code blocks if LLM wrapped it in ```markdown ... ```
        if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```(markdown)?\n/, '').replace(/\n```$/, '');
        }
        
        writeFileSync(zhFile, cleanContent.trim(), 'utf-8');
        logger.success(`[DONE] ${productDirName}`);
    } else {
        logger.error(`[FAILED] ${productDirName}`);
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  logger.divider();
  logger.success(`Translation complete for ${targetDate}! ✨`);
  logger.divider();
}

main().catch((error) => {
  logger.error(`Fatal: ${error.message}`);
  process.exit(1);
});
