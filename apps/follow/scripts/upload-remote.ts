import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Cloudflare from 'cloudflare';

/**
 * NOTE: This script uses:
 * 1. The official Cloudflare SDK (cloudflare) for D1 control plane queries.
 * 2. The AWS S3 SDK (@aws-sdk/client-s3) for R2 data plane uploads (high performance).
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
  D1_DATABASE_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

const cfClient = new Cloudflare({
  apiToken: CLOUDFLARE_API_TOKEN,
});

const s3Client = (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) ? new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null;

const ARGS = process.argv.slice(2);
const SKIP_IMAGES = ARGS.includes('--skip-images');
const FORCE = ARGS.includes('--force');

// --- UTILS ---

function escapeSql(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql(date: string, products: Product[]): string[] {
  const values = products.map((p, index) => {
    const rank = index + 1;
    return `(${escapeSql(p.id)}, ${escapeSql(date)}, ${rank}, ${escapeSql(p.slug)}, ${escapeSql(p.title)}, ${escapeSql(p.taglineZh)}, ${p.votes}, ${escapeSql(p.url)}, ${escapeSql(p.website)}, ${escapeSql(p.topicsZh)}, ${p.isAi ? 1 : 0}, ${escapeSql(p.thumbnail)}, ${escapeSql(p.descriptionHtml)})`;
  }).join(',\n');

  return [
    `INSERT OR REPLACE INTO ph_products (id, date, rank, slug, title, tagline_zh, votes, url, website, topics_zh, is_ai, thumbnail, description_html) VALUES ${values};`,
    `INSERT OR REPLACE INTO ph_dates (date, source, product_count, created_at) VALUES (${escapeSql(date)}, 'producthunt', ${products.length}, CURRENT_TIMESTAMP);`
  ];
}

/**
 * Execute SQL on Cloudflare D1 via official SDK
 */
async function executeD1Query(sql: string) {
  const result = await cfClient.d1.database.query(D1_DATABASE_ID as string, {
    account_id: CLOUDFLARE_ACCOUNT_ID as string,
    sql
  });
  return result;
}

/**
 * Upload to R2 (Using AWS S3 SDK for performance)
 */
async function uploadToR2(img: ImageMetadata) {
  if (!s3Client) {
    // Fallback to wrangler if S3 credentials are missing
    const cmd = `npx wrangler r2 object put "${R2_BUCKET_NAME}/${img.r2Key}" --file="${img.localPath}" --remote`;
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
      console.error(`\n❌ Wrangler upload failed: ${img.r2Key}`);
      throw e;
    }
    return;
  }

  const fileContent = await readFile(img.localPath);
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: img.r2Key,
    Body: fileContent,
  });

  await s3Client.send(command);
}

async function handleRemoteUpload(data: UploadData) {
  console.log(`\n🌍 Cloudflare API Connection (${data.date})`);

  // 1. R2 Uploads
  if (!SKIP_IMAGES && data.images.length > 0) {
    console.log(`📸 Uploading ${data.images.length} images to remote R2...`);
    for (const img of data.images) {
      await uploadToR2(img);
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  // 2. D1 SQL Execution
  console.log('💾 Executing SQL via Cloudflare D1 API...');
  const sqls = generateSql(data.date, data.products);
  
  try {
    for (const sql of sqls) {
      await executeD1Query(sql);
    }
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
  const skippedDates: string[] = [];
  for (const date of dates) {
    const markerPath = join(DATA_ROOT, date, '.uploaded-remote');
    const hasMarker = await readFile(markerPath).then(() => true).catch(() => false);
    if (!hasMarker || FORCE) {
      pendingDates.push(date);
    } else {
      skippedDates.push(date);
    }
  }

  if (skippedDates.length > 0) {
    console.log(`⏩ Skipping ${skippedDates.length} dates (already uploaded to remote): ${skippedDates.join(', ')}`);
  }

  if (pendingDates.length === 0) {
    console.log('✨ All bundles have been uploaded to remote environment.\n');
    return;
  }

  console.log(`📂 Found ${pendingDates.length} pending remote uploads: ${pendingDates.join(', ')}`);

  for (let i = 0; i < pendingDates.length; i++) {
    const date = pendingDates[i];
    console.log(`\n📦 [${i + 1}/${pendingDates.length}] Processing ${date}...`);

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
