import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { fetchArticles } from './fetch-articles.js';
import { parseStory } from './parse-article.js';
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
  logger.info(`🚀 Hacker News Strategic Monitor (Strategy A + Show HN)`);
  logger.divider();

  // 1. 确定目录
  const outputDir = join(__dirname, '..', config.output.dir);
  ensureDir(outputDir);

  // 2. 获取已有文件（用于去重）
  const existingFiles = getExistingFiles(outputDir);
  logger.info(`Database: ${existingFiles.length} archived items`);

  // 3. 抓取并按照我们的逻辑过滤
  logger.info(`Monitoring domains: ${config.filtering.trustedDomains.join(', ')}`);
  logger.info(`Monitoring keywords: ${config.filtering.keywords.join(', ')}`);
  
  const stories = await fetchArticles();
  logger.info(`Fetched ${stories.length} candidate stories from feeds.`);
  logger.divider();

  let saved = 0;
  let skipped = 0;

  // 4. 重构、去重并保存
  for (const story of stories) {
    try {
      const { slug, markdown, meta } = parseStory(story);
      const fileName = `${slug}.md`;
      const filePath = join(outputDir, fileName);

      // 检查文件名是否已存在
      if (existingFiles.includes(fileName)) {
        skipped++;
        continue;
      }

      // 检查 points (双重确认)
      if (story.points < config.filtering.minPoints && story.sourceType !== 'Trusted Domain') {
        continue;
      }

      // 保存
      const written = writeArticle(filePath, markdown);
      if (written) {
        saved++;
        logger.info(`[${story.sourceType}] → ${meta.title} (${story.points} pts)`);
      }
    } catch (error) {
      logger.error(`Processing error: ${story.title} — ${error.message}`);
    }
  }

  // 5. 汇总
  logger.divider();
  logger.success(`Summary: Saved ${saved} new items, Skipped ${skipped} duplicates.`);
  logger.divider();
  logger.success(`Hacker News Sync Complete! ✨`);
}

main().catch((error) => {
  logger.error(`Fatal: ${error.message}`);
  process.exit(1);
});
