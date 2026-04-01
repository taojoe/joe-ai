import matter from 'gray-matter';
import { marked } from 'marked';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { getPlatformProxy } from 'wrangler';

interface Product {
  id: string;
  title: string;
  taglineZh: string | null;
  votes: number;
  url: string | null;
  website: string | null;
  date: string;
  topics: string[];
  topicsZh: string;
  makers: string[];
  isAi: boolean;
  thumbnail: string | null;
  descriptionHtml: string | null;
  slug: string;
}

interface ImageUpload {
  localPath: string;
  r2Key: string;
  slug: string;
  file: string;
}

// CLI args
const args = process.argv.slice(2);
const dateArg = args.find((arg) => arg.startsWith('--date='));
const isLocal = args.includes('--local');
const isRemote = args.includes('--remote');
const skipImages = args.includes('--skip-images');
const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 10;
const dryRun = args.includes('--dry-run');

if (!dateArg) {
  console.error('Usage: npx tsx upload.ts --date=2026-03-31 [--local|--remote] [--skip-images] [--batch-size=5] [--dry-run]');
  process.exit(1);
}

const date = dateArg.split('=')[1];

if (!isLocal && !isRemote) {
  console.error('Please specify --local or --remote');
  process.exit(1);
}

const INPUT_DIR = join(process.cwd(), '../../follow/output/producthunt-daily', date);

async function scanDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function parseProduct(productDir: string): Promise<Product> {
  const indexPath = join(productDir, 'index.md');
  const zhPath = join(productDir, 'zh.md');

  const indexContent = await readFile(indexPath, 'utf-8');
  const zhContent = await readFile(zhPath, 'utf-8');

  const { data: frontmatter } = matter(indexContent);

  const taglineMatch = zhContent.match(/^> (.+)$/m);
  const taglineZh = taglineMatch ? taglineMatch[1] : frontmatter.tagline;

  const descriptionMatch = zhContent.match(/## 产品简介\n([\s\S]+?)(?:## |$)/);
  const descriptionText = descriptionMatch ? descriptionMatch[1].trim() : '';
  const descriptionHtml = await marked.parse(descriptionText);

  const topics = frontmatter.topics || [];
  const topicsZh = JSON.stringify(topics);

  const imagesDir = join(productDir, 'images');
  const imageFiles = await readdir(imagesDir).catch(() => []);
  const thumbnailFile = imageFiles.find((f) => f.startsWith('thumb'));
  const thumbnail = thumbnailFile ? `images/${basename(productDir)}/${thumbnailFile}` : null;

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    taglineZh,
    votes: frontmatter.votes || 0,
    url: frontmatter.url,
    website: frontmatter.website,
    date: frontmatter.date,
    topics: frontmatter.topics,
    topicsZh,
    makers: frontmatter.makers,
    isAi: frontmatter.is_ai || false,
    thumbnail,
    descriptionHtml,
    slug: '',
  };
}

async function uploadImageToR2(localPath: string, r2Key: string, assets?: any): Promise<boolean> {
  const BUCKET = 'follow-assets';
  try {
    if (isLocal && assets) {
      const content = await readFile(localPath);
      await assets.put(r2Key, content);
      return true;
    }

    const cmd = isLocal
      ? `wrangler r2 object put "${BUCKET}/${r2Key}" --file="${localPath}" --local`
      : `wrangler r2 object put "${BUCKET}/${r2Key}" --file="${localPath}"`;

    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error(`\n  ❌ Failed: ${r2Key} - ${(e as Error).message}`);
    return false;
  }
}

async function uploadImagesBatch(images: ImageUpload[], batchSize: number, assets?: any): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(images.length / batchSize);

    process.stdout.write(`\n  📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)... `);

    const results = await Promise.all(
      batch.map(({ localPath, r2Key }) => uploadImageToR2(localPath, r2Key, assets))
    );

    results.forEach((ok) => {
      if (ok) {
        process.stdout.write('.');
        success++;
      } else {
        process.stdout.write('x');
        failed++;
      }
    });

    process.stdout.write(` done`);
  }

  return { success, failed };
}

async function main() {
  console.log('\n📦 Product Hunt Upload Script');
  console.log('─'.repeat(50));
  console.log(`   Date: ${date}`);
  console.log(`   Mode: ${isLocal ? 'Local (wrangler proxy)' : 'Remote'}`);
  console.log(`   Skip images: ${skipImages}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Dry run: ${dryRun}`);
  console.log('─'.repeat(50));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - no data will be written\n');
  }

  // Get platform proxy for D1
  console.log('\n🔗 Connecting to wrangler proxy...');
  const { env } = await getPlatformProxy({});
  console.log('   ✓ Connected\n');

  // Scan products
  console.log('📂 Scanning products...');
  const productDirs = await scanDir(INPUT_DIR);
  console.log(`   Found ${productDirs.length} products\n`);

  const products: Product[] = [];
  const allImages: ImageUpload[] = [];

  // Parse each product
  for (const slug of productDirs) {
    const productDir = join(INPUT_DIR, slug);
    process.stdout.write(`  Processing ${slug}... `);

    try {
      const product = await parseProduct(productDir);
      product.slug = slug;
      products.push(product);

      // Queue images
      if (!skipImages) {
        const imagesDir = join(productDir, 'images');
        const imageFiles = await readdir(imagesDir).catch(() => []);

        for (const file of imageFiles) {
          const localPath = join(imagesDir, file);
          const r2Key = `producthunt/${date}/images/${slug}/${file}`;
          allImages.push({ localPath, r2Key, slug, file });
        }
      }

      console.log(`✓ ${product.title} (${product.votes} votes)`);
    } catch (e) {
      console.error(`❌ Error: ${(e as Error).message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Images queued: ${allImages.length}`);

  if (dryRun) {
    console.log('\n✅ Dry run complete!');
    process.exit(0);
  }

  // Upload images
  if (!skipImages && allImages.length > 0) {
    console.log('\n📸 Uploading images to R2...');
    const { success, failed } = await uploadImagesBatch(allImages, batchSize, env.FOLLOW_ASSETS);
    console.log(`\n   ✅ Success: ${success}, ❌ Failed: ${failed}`);
  }

  // Insert D1 data
  console.log('\n💾 Inserting data to D1...');

  try {
    let inserted = 0;
    for (const p of products) {
      const stmt = env.FOLLOW_DB.prepare(`
        INSERT OR REPLACE INTO ph_products
        (id, date, rank, slug, title, tagline_zh, votes, url, website, topics_zh, is_ai, thumbnail, description_html)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await stmt.bind(
        p.id,
        date,
        productDirs.indexOf(p.slug) + 1,
        p.slug,
        p.title,
        p.taglineZh || null,
        p.votes || 0,
        p.url || null,
        p.website || null,
        p.topicsZh,
        p.isAi ? 1 : 0,
        p.thumbnail || null,
        p.descriptionHtml || null
      ).run();

      inserted++;
      process.stdout.write(`.`);
    }

    // Insert date record
    const dateStmt = env.FOLLOW_DB.prepare(`
      INSERT OR REPLACE INTO ph_dates (date, source, product_count, created_at)
      VALUES (?, 'producthunt', ?, CURRENT_TIMESTAMP)
    `);
    await dateStmt.bind(date, products.length).run();
    process.stdout.write('.\n');

    console.log(`   ✅ Inserted ${inserted} products`);
    console.log('\n✅ Upload complete!');
  } catch (e) {
    console.error(`\n❌ D1 Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

main().catch(console.error);
