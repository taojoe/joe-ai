import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { fetchArticles } from './fetch-articles.js';
import { parseArticle } from './parse-article.js';
import { ensureDir, writeArticle, getExistingFiles } from '../utils/file-manager.js';
import { logger } from '../utils/logger.js';
import { sleep } from '../utils/web-scraper.js';
import { generateSlug } from '../utils/markdown-formatter.js';
import { parseFuzzyDate } from './parse-article.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

// 解析命令行参数
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 10;

const FETCH_DELAY_MS = 300;

async function main() {
  logger.divider();
  logger.info(`🚀 Superhuman AI — Article Fetcher`);
  logger.divider();

  // 确定输出目录
  const outputDir = join(__dirname, '..', config.output.dir);
  ensureDir(outputDir);

  // 获取已有文件（用于去重）
  const existingFiles = getExistingFiles(outputDir);
  logger.info(`Found ${existingFiles.length} existing articles`);

  // 抓取文章列表
  const articles = await fetchArticles({ limit });
  logger.info(`Found ${articles.length} articles from homepage/archive`);
  logger.divider();

  // 反转列表：按时间正序处理（最旧的在前）
  articles.reverse();
  logger.info(`Processing in chronological order (oldest first)`);

  // 处理每篇文章
  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    // 提前检查：直接检查本地是否有包含该 slug 的文件
    const fileName = existingFiles.find(f => f.endsWith(`-${article.slug}.md`));

    if (fileName) {
      // 按时间正序处理，遇到已存在的文章说明后面更新的也一定已处理过
      logger.info(`Reached previously processed: ${fileName} — all caught up!`);
      skipped = articles.length - i;
      break;
    }

    try {
      const { slug, markdown, meta } = await parseArticle(article, config.content.sourceName);
      const filePath = join(outputDir, `${slug}.md`);

      // 保存文件
      const written = writeArticle(filePath, markdown);
      if (written) {
        saved++;
        logger.info(`  → ${meta.sectionsCount} sections extracted`);
      }
    } catch (error) {
      logger.error(`Failed to process: ${article.title} — ${error.message}`);
    }

    // 礼貌延迟（最后一篇不用等）
    if (i < articles.length - 1) {
      await sleep(FETCH_DELAY_MS);
    }
  }

  // 汇总
  logger.divider();
  logger.success(`Done! Saved: ${saved}, Skipped: ${skipped}, Scanned: ${articles.length}`);
  logger.divider();
  
  // 显式退出进程，因为 opencode-browser 的 socket 连接可能会保持活动状态阻止进程自然结束
  process.exit(0);
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
