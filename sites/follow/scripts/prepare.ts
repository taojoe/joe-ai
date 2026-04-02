import matter from 'gray-matter';
import { marked } from 'marked';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { join, basename, dirname } from 'path';

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
    topicsZh,
    isAi: frontmatter.is_ai || false,
    thumbnail,
    descriptionHtml,
    slug: '',
  };
}

async function main() {
  const ARGS = process.argv.slice(2);
  const DATE_ARG = ARGS.find((arg) => arg.startsWith('--date='));

  if (!DATE_ARG) {
    console.error('Usage: npx tsx scripts/prepare.ts --date=YYYY-MM-DD');
    process.exit(1);
  }

  const DATE = DATE_ARG.split('=')[1];
  const INPUT_DIR = join(process.cwd(), '../../follow/output/producthunt-daily', DATE);
  const TARGET_DIR = join(process.cwd(), 'data', DATE);
  const TARGET_IMAGES_DIR = join(TARGET_DIR, 'images');

  console.log('\n🏗️  Preparing Data Bundle...');
  console.log(`   Date: ${DATE}`);
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
      const product = await parseProduct(productDir);
      product.slug = slug;
      products.push(product);

      // Handle Image Copying
      const imagesSourceDir = join(productDir, 'images');
      const imageFiles = await readdir(imagesSourceDir).catch(() => []);
      
      if (imageFiles.length > 0) {
        const imagesTargetSubdir = join(TARGET_IMAGES_DIR, slug);
        await mkdir(imagesTargetSubdir, { recursive: true });

        for (const file of imageFiles) {
          const srcPath = join(imagesSourceDir, file);
          const destPath = join(imagesTargetSubdir, file);
          await copyFile(srcPath, destPath);
          
          images.push({
            localPath: destPath,
            r2Key: `producthunt/${DATE}/images/${slug}/${file}`
          });
        }
      }
    } catch (e) {
      console.error(`   ❌ Failed to process ${slug}: ${(e as Error).message}`);
    }
  }

  // Write Data JSON
  const dataPath = join(TARGET_DIR, 'data.json');
  const outputData = {
    date: DATE,
    productCount: products.length,
    products,
    images
  };
  
  await writeFile(dataPath, JSON.stringify(outputData, null, 2));
  console.log(`\n   ✓ Data bundle completed: ${TARGET_DIR}`);
  console.log(`     - JSON: data.json`);
  console.log(`     - Images copied: ${images.length}`);

  console.log('\n✨ Preparation complete!\n');
}

main().catch(console.error);

