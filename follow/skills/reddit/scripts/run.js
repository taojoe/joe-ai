import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { fetchArticles } from './fetch-articles.js';
import { parseArticle } from './parse-article.js';
import { ensureDir, writeArticle, getExistingFiles } from '../utils/file-manager.js';
import { logger } from '../utils/logger.js';
import { formatArticle, generateSlug } from '../utils/markdown-formatter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.json');

if (!existsSync(configPath)) {
  logger.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

// Parse command line arguments
const args = process.argv.slice(2);
let limitPerFeed = 0; // 0 means no limit (or use default inner limits)
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limitPerFeed = parseInt(args[limitIndex + 1], 10);
  if (isNaN(limitPerFeed)) limitPerFeed = 0;
}

async function main() {
  logger.divider();
  logger.info(`🚀 Reddit AI Monitor Started`);
  logger.divider();

  // 1. Ensure output directory exists
  const outputDir = join(__dirname, '..', config.output.dir);
  ensureDir(outputDir);

  // 2. Fetch and filter articles
  logger.info(`Fetching from ${config.feeds.length} predefined subreddits...`);
  if (limitPerFeed) {
    logger.info(`Limit set to ${limitPerFeed} posts per subreddit.`);
  }

  const posts = await fetchArticles(limitPerFeed);
  logger.info(`Fetched ${posts.length} candidate posts crossing thresholds.`);
  logger.divider();

  let saved = 0;
  let skipped = 0;

  // 3. Process, format, and save
  for (const post of posts) {
    try {
      const parsedData = parseArticle(post);
      const slug = generateSlug(parsedData.title, parsedData.date, parsedData.subreddit);
      const fileName = `${slug}.md`;
      const filePath = join(outputDir, fileName);

      // We do not skip checking if we want to overwrite, but writeArticle handles skipping
      // if not explicitly instructed to overwrite (which is the default).
      const markdown = formatArticle(parsedData);
      
      const written = writeArticle(filePath, markdown);
      if (written) {
        saved++;
        logger.info(`[r/${parsedData.subreddit}] → ${parsedData.title.slice(0, 60)}...`);
      } else {
        skipped++;
      }
    } catch (error) {
      logger.error(`Processing error for post ${post.rawItem.title}: ${error.message}`);
    }
  }

  // 4. Summary
  logger.divider();
  logger.success(`Summary: Saved ${saved} new posts, Skipped ${skipped} existing posts.`);
  logger.divider();
  logger.success(`Reddit Sync Complete! ✨`);
}

main().catch((error) => {
  logger.error(`Fatal: ${error.message}`);
  process.exit(1);
});
