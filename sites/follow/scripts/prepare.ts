import matter from 'gray-matter';
import { marked } from 'marked';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { join, basename } from 'path';

interface Product {
  id: string;
  title: string;
  taglineZh: string | null;
  votes: number;
  url: string | null;
  website: string | null;
  date: string;
  topicsZh: string;
  isAi: boolean;
  thumbnail: string | null;
  descriptionHtml: string | null;
  slug: string;
}

interface ImageMetadata {
  localPath: string;
  r2Key: string;
}

async function parseProduct(productDir: string): Promise<{ product: Product, referencedImages: string[] }> {
  const zhPath = join(productDir, 'zh.md');
  const indexPath = join(productDir, 'index.md');

  // Load zh.md
  let zhFrontmatter: any = {};
  let zhMarkdown = '';
  try {
    const zhContent = await readFile(zhPath, 'utf-8');
    const parsed = matter(zhContent);
    zhFrontmatter = parsed.data;
    zhMarkdown = parsed.content;
  } catch (e) {
    // console.warn(`      ⚠️ zh.md not found in ${basename(productDir)}`);
  }

  // Load index.md as base/fallback
  let indexFrontmatter: any = {};
  let indexMarkdown = '';
  try {
    const indexContent = await readFile(indexPath, 'utf-8');
    const parsed = matter(indexContent);
    indexFrontmatter = parsed.data;
    indexMarkdown = parsed.content;
  } catch (e) {
    if (!zhMarkdown) {
      throw new Error(`Both zh.md and index.md are missing in ${productDir}`);
    }
  }

  // Merge metadata (zh overrides index)
  const meta = { ...indexFrontmatter, ...zhFrontmatter };

  // Tagline: prefer zh frontmatter, then zh content ">" line, then index equivalents
  let taglineZh = zhFrontmatter.tagline || (zhMarkdown.match(/^> (.+)$/m)?.[1]);
  if (!taglineZh) {
    taglineZh = indexFrontmatter.tagline || (indexMarkdown.match(/^> (.+)$/m)?.[1]) || '';
  }

  // Description: prefer zh "## 产品简介", then index "## Description"
  let descriptionHtml = '';
  const zhDescMatch = zhMarkdown.match(/## 产品简介\n([\s\S]+?)(?:## |$)/);
  if (zhDescMatch) {
    descriptionHtml = await marked.parse(zhDescMatch[1].trim());
  } else {
    const indexDescMatch = indexMarkdown.match(/## Description\n([\s\S]+?)(?:## |$)/);
    if (indexDescMatch) {
      descriptionHtml = await marked.parse(indexDescMatch[1].trim());
    }
  }

  // Topics: prefer zh frontmatter, then index frontmatter
  const topics = zhFrontmatter.topics || indexFrontmatter.topics || [];
  const topicsZh = JSON.stringify(topics);

  // Find only the image referenced in zh.md frontmatter cover
  const referencedImages = new Set<string>();
  let thumbnailFile: string | null = null;
  if (zhFrontmatter.cover) {
    const match = zhFrontmatter.cover.match(/images\/([\w\.-]+\.(?:png|jpg|jpeg|gif|webp|svg|avif))/i);
    const fileName = match ? match[1] : basename(zhFrontmatter.cover);
    thumbnailFile = fileName;
    referencedImages.add(fileName);
  }

  const slug = basename(productDir);
  const thumbnail = thumbnailFile ? `images/${slug}/${thumbnailFile}` : null;


  const product = {
    id: String(meta.id || ''),
    title: String(meta.title || ''),
    taglineZh,
    votes: Number(meta.votes || 0),
    url: meta.url || null,
    website: meta.website || null,
    date: meta.date ? String(meta.date) : '',
    topicsZh,
    isAi: meta.is_ai || false,
    thumbnail,
    descriptionHtml,
    slug: '',
  };

  return { product, referencedImages: Array.from(referencedImages) };
}

async function processDate(date: string) {
  const INPUT_DIR = join(process.cwd(), '../../follow/output/producthunt-daily', date);
  const TARGET_DIR = join(process.cwd(), 'data', date);
  const TARGET_IMAGES_DIR = join(TARGET_DIR, 'images');

  console.log(`\n🏗️  Processing Bundle: ${date}`);
  console.log(`   Source: ${INPUT_DIR}`);
  console.log(`   Target: ${TARGET_DIR}`);

  await mkdir(TARGET_IMAGES_DIR, { recursive: true });

  const productDirs = await (await readdir(INPUT_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  console.log(`   Found ${productDirs.length} products`);

  const products: Product[] = [];
  const images: ImageMetadata[] = [];

  for (const slug of productDirs) {
    const productDir = join(INPUT_DIR, slug);
    try {
      const { product, referencedImages } = await parseProduct(productDir);
      product.slug = slug;
      products.push(product);

      // Handle Image Copying - ONLY referenced images
      if (referencedImages.length > 0) {
        const imagesSourceDir = join(productDir, 'images');
        const imagesTargetSubdir = join(TARGET_IMAGES_DIR, slug);
        await mkdir(imagesTargetSubdir, { recursive: true });

        for (const file of referencedImages) {
          const srcPath = join(imagesSourceDir, file);
          const destPath = join(imagesTargetSubdir, file);
          
          try {
            await copyFile(srcPath, destPath);
            images.push({
              localPath: destPath,
              r2Key: `producthunt/${date}/images/${slug}/${file}`
            });
          } catch (err) {
            console.warn(`      ⚠️ Referenced image not found: ${file} in ${slug}`);
          }
        }
      }
    } catch (e) {
      console.error(`   ❌ Failed to process ${slug}: ${(e as Error).message}`);
    }
  }

  // Write Data JSON
  const dataPath = join(TARGET_DIR, 'data.json');
  const outputData = {
    date,
    productCount: products.length,
    products,
    images
  };
  
  await writeFile(dataPath, JSON.stringify(outputData, null, 2));
  console.log(`   ✓ Complete: data.json + ${images.length} images`);
}

async function main() {
  const SOURCE_ROOT = join(process.cwd(), '../../follow/output/producthunt-daily');
  const DATA_ROOT = join(process.cwd(), 'data');

  console.log('\n🔍 Scanning for unprocessed dates...');

  // 1. Get source dates
  const sourceDirs = await readdir(SOURCE_ROOT, { withFileTypes: true }).catch(() => []);
  const sourceDates = sourceDirs
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (sourceDates.length === 0) {
    console.error(`❌ No source dates found in ${SOURCE_ROOT}`);
    process.exit(1);
  }

  // 2. Get processed dates
  await mkdir(DATA_ROOT, { recursive: true });
  const processedDirs = await readdir(DATA_ROOT, { withFileTypes: true }).catch(() => []);
  const processedDates = processedDirs
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  // 3. Find missing
  const missingDates = sourceDates.filter(d => !processedDates.includes(d));

  if (missingDates.length === 0) {
    console.log('✨ All dates are already processed. Nothing to do!\n');
    return;
  }

  console.log(`📂 Found ${missingDates.length} unprocessed dates: ${missingDates.join(', ')}`);

  for (const date of missingDates) {
    await processDate(date);
  }

  console.log('\n✨ All missing bundles have been prepared!\n');
}

main().catch(console.error);
