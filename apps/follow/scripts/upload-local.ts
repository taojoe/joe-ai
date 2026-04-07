import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getPlatformProxy } from 'wrangler';

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

interface UploadData {
  date: string;
  productCount: number;
  products: Product[];
  images: ImageMetadata[];
}

// --- CONFIG ---
const ARGS = process.argv.slice(2);
const SKIP_IMAGES = ARGS.includes('--skip-images');

// --- HANDLERS ---

async function handleLocalUpload(data: UploadData, env: any) {
  console.log(`\n🔗 Connection: Local Development Proxy (${data.date})`);
  const db = env.FOLLOW_DB as any;
  const assets = env.FOLLOW_ASSETS as any;

  if (!SKIP_IMAGES && data.images.length > 0) {
    console.log(`📸 Uploading ${data.images.length} images to local R2...`);
    for (const img of data.images) {
      const content = await readFile(img.localPath);
      await assets.put(img.r2Key, new Uint8Array(content));
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  console.log('💾 Inserting data to local D1...');
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    const rank = i + 1;
    await db.prepare(`
      INSERT OR REPLACE INTO ph_products (id, date, rank, slug, title, tagline_zh, votes, url, website, topics_zh, is_ai, thumbnail, description_html)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(p.id, data.date, rank, p.slug, p.title, p.taglineZh, p.votes, p.url, p.website, p.topicsZh, p.isAi ? 1 : 0, p.thumbnail, p.descriptionHtml).run();
    process.stdout.write('.');
  }
  
  await db.prepare(`
    INSERT OR REPLACE INTO ph_dates (date, source, product_count, created_at)
    VALUES (?, 'producthunt', ?, CURRENT_TIMESTAMP)
  `).bind(data.date, data.products.length).run();

  console.log('\n   ✓ D1 Success');
}

// --- MAIN ---

async function main() {
  const DATA_ROOT = join(process.cwd(), 'data');

  console.log('\n🔍 Scanning for dates pending local upload...');

  // 1. Get all dates in data folder
  const dataDirs = await readdir(DATA_ROOT, { withFileTypes: true }).catch(() => []);
  const dates = dataDirs
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (dates.length === 0) {
    console.log('⚠️  No data bundles found in data/ directory.\n');
    return;
  }

  const pendingDates: string[] = [];
  const skippedDates: string[] = [];
  for (const date of dates) {
    const markerPath = join(DATA_ROOT, date, '.uploaded-local');
    const hasMarker = await readFile(markerPath).then(() => true).catch(() => false);
    if (!hasMarker) {
      pendingDates.push(date);
    } else {
      skippedDates.push(date);
    }
  }

  if (skippedDates.length > 0) {
    console.log(`⏩ Skipping ${skippedDates.length} dates (already uploaded): ${skippedDates.join(', ')}`);
  }

  if (pendingDates.length === 0) {
    console.log('✨ All bundles have been uploaded to local environment.\n');
    return;
  }

  console.log(`📂 Found ${pendingDates.length} pending local uploads: ${pendingDates.join(', ')}`);

  const { env, dispose } = await getPlatformProxy();

  try {
    for (let i = 0; i < pendingDates.length; i++) {
      const date = pendingDates[i];
      console.log(`\n📦 [${i + 1}/${pendingDates.length}] Processing ${date}...`);
      
      const dataJsonPath = join(DATA_ROOT, date, 'data.json');
      try {
        const rawData = await readFile(dataJsonPath, 'utf-8');
        const data: UploadData = JSON.parse(rawData);
        
        await handleLocalUpload(data, env);
        await writeFile(join(DATA_ROOT, date, '.uploaded-local'), new Date().toISOString());
        console.log(`   ✓ Recorded status for ${date}`);
      } catch (e) {
        console.error(`\n❌ Failed to upload ${date}: ${(e as Error).message}`);
      }
    }
  } finally {
    await dispose();
  }

  console.log('\n✨ Local upload processing finished!\n');
}

main().catch(console.error);

