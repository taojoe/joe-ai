import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { fetchDailyPosts } from './fetch-posts.js';
import { parsePost } from './parse-post.js';
import { ensureDir, writeArticle, getExistingDirs, downloadImage } from '../utils/file-manager.js';
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

  // 2. 确定根目录
  const outputRoot = join(__dirname, '..', config.output.dir);
  const dayDir = join(outputRoot, dateStr);
  ensureDir(dayDir);

  // 3. 获取已有目录（用于去重）
  const existingDirs = getExistingDirs(dayDir);
  logger.info(`Directory: ${existingDirs.length} existing products for this date`);

  // 4. 开始抓取
  try {
    const rawPosts = await fetchDailyPosts(dateStr);
    logger.info(`Fetched ${rawPosts.length} featured posts from API.`);
    logger.divider();

    let saved = 0;
    let skipped = 0;

    // 5. 解析并保存 (按排名遍历)
    for (let i = 0; i < rawPosts.length; i++) {
        const post = rawPosts[i];
        const rank = (i + 1).toString().padStart(2, '0');
        
        try {
            const { slug, markdown, imageTasks, meta } = parsePost(post, dateStr);
            const productDirName = `${rank}-${slug}`;
            const productDir = join(dayDir, productDirName);
            const imageDir = join(productDir, 'images');
            const indexFilePath = join(productDir, 'index.md');

            // 去重判断：只有当目录存在且 index.md 文件也存在时，才视为已处理
            if (existsSync(indexFilePath)) {
                skipped++;
                logger.skip(`[EXISTS] #${rank} ${meta.title}`);
                continue;
            }

            logger.divider();
            logger.info(`[PROCESSING] #${rank} ${meta.title}`);

            // 创建产品目录和图片目录
            ensureDir(productDir);
            if (imageTasks.length > 0) {
                ensureDir(imageDir);
            }

            // 下载图片
            if (imageTasks.length > 0) {
                logger.info(`Checking ${imageTasks.length} images...`);
                for (const task of imageTasks) {
                    const destPath = join(imageDir, task.localName);
                    if (existsSync(destPath)) {
                        logger.skip(`[IMAGE EXISTS] ${task.localName}`);
                        continue;
                    }
                    await downloadImage(task.url, destPath);
                }
            }

            // 保存 index.md
            const written = writeArticle(indexFilePath, markdown);
            
            if (written) {
                saved++;
                logger.info(`[DAILY NEW] #${rank} → ${meta.title} (${meta.votes} votes)`);
            }
        } catch (err) {
            logger.error(`Error processing post ${post.name}: ${err.message}`);
        }
    }

    // 6. 汇总
    logger.divider();
    logger.success(`Summary for ${dateStr}: Saved ${saved} new products, Skipped ${skipped} duplicates.`);
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
