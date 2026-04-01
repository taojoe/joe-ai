import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { fetchDailyPosts } from './fetch-posts.js';
import { parsePost } from './parse-post.js';
import { ensureDir, writeArticle, getExistingFiles } from '../utils/file-manager.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.json');

if (!existsSync(configPath)) {
  logger.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

/**
 * 获取日期字符串 (YYYY-MM-DD)
 * 默认为“昨日”
 */
function getDateString(offset = -1) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

async function main() {
  logger.divider();
  logger.info(`🚀 Product Hunt Daily Monitor (${config.displayName})`);
  logger.divider();

  // 1. 确定日期
  const dateStr = getDateString(); // 默认昨日
  logger.info(`Target Date: ${dateStr} (Yesterday)`);

  // 2. 确定目录
  const outputDir = join(__dirname, '..', config.output.dir);
  ensureDir(outputDir);

  // 3. 获取已有文件（用于去重）
  const existingFiles = getExistingFiles(outputDir);
  logger.info(`Database: ${existingFiles.length} archived items`);

  // 4. 开始抓取
  try {
    const rawPosts = await fetchDailyPosts(dateStr);
    logger.info(`Fetched ${rawPosts.length} featured posts from API.`);
    logger.divider();

    let saved = 0;
    let skipped = 0;

    // 5. 解析并保存
    for (const post of rawPosts) {
      try {
        const { slug, markdown, meta } = parsePost(post, dateStr);
        const fileName = `${dateStr}-${slug}.md`;
        const filePath = join(outputDir, fileName);

        // 去重
        if (existingFiles.includes(fileName)) {
          skipped++;
          continue;
        }

        // 保存
        const written = writeArticle(filePath, markdown);
        if (written) {
          saved++;
          logger.info(`[DAILY NEW] → ${meta.title} (${meta.votes} votes)`);
        }
      } catch (err) {
        logger.error(`Error processing post ${post.name}: ${err.message}`);
      }
    }

    // 6. 汇总
    logger.divider();
    logger.success(`Summary for ${dateStr}: Saved ${saved} new, Skipped ${skipped} duplicates.`);
    logger.divider();
    logger.success(`Product Hunt Daily Sync Complete! ✨`);

  } catch (error) {
    logger.error(`Fatal execution error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(`Unhandled: ${error.message}`);
  process.exit(1);
});
