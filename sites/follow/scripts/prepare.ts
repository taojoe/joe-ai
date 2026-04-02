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
  
  // 1. Try to get thumbnail from first line of zh.md
  // Format: ![Thumbnail](images/media-0.png)
  const firstLine = zhContent.split('\n')[0];
  const thumbnailMatch = firstLine.match(/!\[.*\]\(images\/([\w\.-]+\.(?:png|jpg|jpeg|gif|webp|svg|avif))\)/i);
  let thumbnailFile = thumbnailMatch ? thumbnailMatch[1] : null;

  // 2. Fallback to file starting with 'thumb'
  if (!thumbnailFile) {
    thumbnailFile = imageFiles.find((f) => f.startsWith('thumb')) || null;
  }

  const thumbnail = thumbnailFile ? `images/${basename(productDir)}/${thumbnailFile}` : null;

  // Find all images referenced in the description
  const referencedImages = new Set<string>();
  if (thumbnailFile) referencedImages.add(thumbnailFile);
  
  // Basic regex to find images/filename.ext in the description
  const imgRegex = /images\/([\w\.-]+\.(?:png|jpg|jpeg|gif|webp|svg|avif))/gi;
  let match;
  while ((match = imgRegex.exec(descriptionText)) !== null) {
    referencedImages.add(match[1]);
  }

  const product = {
    id: frontmatter.id,
    title: frontmatter.title,
    taglineZh,
    votes: frontmatter.votes || 0,
    url: frontmatter.url,
    website: frontmatter.website,
    date: frontmatter.date,
    topicsZh,
    isAi: frontmatter.is_ai || false,
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
