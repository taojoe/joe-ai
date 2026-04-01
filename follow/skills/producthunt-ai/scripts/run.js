import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { fetchArticles } from './fetch-articles.js';
import { parseProduct } from './parse-article.js';
import { ensureDir, writeArticle, getExistingFiles } from '../utils/file-manager.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.json');

if (!existsSync(configPath)) {
  logger.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

async function main() {
  logger.divider();
  logger.info(`🚀 Product Hunt AI Monitor (${config.displayName})`);
  logger.divider();

  // 1. 确定目录
  const outputDir = join(__dirname, '..', config.output.dir);
  ensureDir(outputDir);

  // 2. 获取已有文件（用于去重）
  const existingFiles = getExistingFiles(outputDir);
  logger.info(`Database: ${existingFiles.length} archived items`);

  // 3. 抓取
  logger.info(`Source: ${config.source.url}`);
  
  const rawProducts = await fetchArticles();
  logger.info(`Fetched ${rawProducts.length} candidate products from feed.`);
  logger.divider();

  let saved = 0;
  let skipped = 0;

  // 4. 重构、去重并保存
  for (const item of rawProducts) {
    try {
      const { slug, markdown, meta } = parseProduct(item);
      const fileName = `${slug}.md`;
      const filePath = join(outputDir, fileName);

      // 1. 物理去重
      if (existingFiles.includes(fileName)) {
        skipped++;
        continue;
      }

      // 2. 关键词过滤 (可选双重确认，虽然 Feed 已经分类)
      const matchesKeyword = config.filtering.keywords.some(k => 
        meta.title.toLowerCase().includes(k.toLowerCase()) || 
        meta.tagline.toLowerCase().includes(k.toLowerCase())
      );

      if (!matchesKeyword) {
          // logger.skip(`Filtered: ${meta.title} (No relevant AI keywords)`);
          // continue; 
          // 既然是 category feed, 基本上都是 AI 相关的，我们就不用过滤了，除非用户需要
      }

      // 保存
      const written = writeArticle(filePath, markdown);
      if (written) {
        saved++;
        logger.info(`[PH NEW] → ${meta.title} | ${meta.tagline.slice(0, 40)}...`);
      }
    } catch (error) {
      logger.error(`Processing error: ${item.title} — ${error.message}`);
    }
  }

  // 5. 汇总
  logger.divider();
  logger.success(`Summary: Saved ${saved} new items, Skipped ${skipped} duplicates.`);
  logger.divider();
  logger.success(`Product Hunt AI Sync Complete! ✨`);
}

main().catch((error) => {
  logger.error(`Fatal: ${error.message}`);
  process.exit(1);
});
