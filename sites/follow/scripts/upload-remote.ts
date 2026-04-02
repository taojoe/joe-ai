import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * NOTE: This script uses the native Cloudflare REST API (via fetch) to execute D1 queries,
 * avoiding the overhead of the wrangler CLI. 
 * For R2 uploads, it currently relies on wrangler as npm was unable to install the S3 SDK.
 */

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

// --- ENV CHECK ---
const {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  D1_DATABASE_ID = 'bfd0d75c-3f43-4e4a-8f5c-8a8b8c8d8e8f',
  R2_BUCKET_NAME = 'follow-assets'
} = process.env;

const ARGS = process.argv.slice(2);
const SKIP_IMAGES = ARGS.includes('--skip-images');

// --- UTILS ---

function escapeSql(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql(date: string, products: Product[]): string {
  const values = products.map((p, index) => {
    const rank = index + 1;
    return `(${escapeSql(p.id)}, ${escapeSql(date)}, ${rank}, ${escapeSql(p.slug)}, ${escapeSql(p.title)}, ${escapeSql(p.taglineZh)}, ${p.votes}, ${escapeSql(p.url)}, ${escapeSql(p.website)}, ${escapeSql(p.topicsZh)}, ${p.isAi ? 1 : 0}, ${escapeSql(p.thumbnail)}, ${escapeSql(p.descriptionHtml)})`;
  }).join(',\n');

  return `
INSERT OR REPLACE INTO ph_products (id, date, rank, slug, title, tagline_zh, votes, url, website, topics_zh, is_ai, thumbnail, description_html)
VALUES
${values};

INSERT OR REPLACE INTO ph_dates (date, source, product_count, created_at)
VALUES (${escapeSql(date)}, 'producthunt', ${products.length}, CURRENT_TIMESTAMP);
  `.trim();
}

/**
 * Execute SQL on Cloudflare D1 via REST API
 */
async function executeD1Query(sql: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });

  const result = await response.json() as any;
  if (!result.success) {
    throw new Error(`D1 API Error: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

/**
 * Upload to R2 (Currently using wrangler as S3 SDK is unavailable)
 */
async function uploadToR2(img: ImageMetadata) {
  const cmd = `wrangler r2 object put "${R2_BUCKET_NAME}/${img.r2Key}" --file="${img.localPath}"`;
  execSync(cmd, { stdio: 'ignore' });
}

async function handleRemoteUpload(data: UploadData) {
  console.log(`\n🌍 Cloudflare API Upload: ${data.date}`);

  // 1. R2 Uploads
  if (!SKIP_IMAGES && data.images.length > 0) {
    console.log(`📸 Uploading ${data.images.length} images to R2...`);
    for (const img of data.images) {
      await uploadToR2(img);
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  // 2. D1 SQL Execution
  console.log('💾 Executing SQL via Cloudflare D1 API...');
  const sql = generateSql(data.date, data.products);
  
  try {
    await executeD1Query(sql);
    console.log('   ✓ D1 Success');
  } catch (e) {
    console.error('\n❌ D1 API Execution failed.');
    throw e;
  }
}

// --- MAIN ---

async function main() {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Missing required environment variables!');
    console.error('   Please provide CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
    console.error('   You can run this with: CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npx tsx ...');
    process.exit(1);
  }

  const DATA_ROOT = join(process.cwd(), 'data');

  console.log('\n🔍 Scanning for dates pending remote upload...');

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
  for (const date of dates) {
    const markerPath = join(DATA_ROOT, date, '.uploaded-remote');
    const hasMarker = await readFile(markerPath).then(() => true).catch(() => false);
    if (!hasMarker) {
      pendingDates.push(date);
    }
  }

  if (pendingDates.length === 0) {
    console.log('✨ All bundles have been uploaded to remote environment.\n');
    return;
  }

  console.log(`📂 Found ${pendingDates.length} pending remote uploads: ${pendingDates.join(', ')}`);

  for (const date of pendingDates) {
    const dataJsonPath = join(DATA_ROOT, date, 'data.json');
    try {
      const rawData = await readFile(dataJsonPath, 'utf-8');
      const data: UploadData = JSON.parse(rawData);
      
      await handleRemoteUpload(data);
      await writeFile(join(DATA_ROOT, date, '.uploaded-remote'), new Date().toISOString());
      console.log(`   ✓ Recorded status for ${date}`);
    } catch (e) {
      console.error(`\n❌ Failed to upload ${date}: ${(e as Error).message}`);
    }
  }

  console.log('\n✨ Remote upload processing finished!\n');
}

main().catch(console.error);
