import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

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
const R2_BUCKET_NAME = 'follow-assets';

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

async function handleRemoteUpload(data: UploadData) {
  console.log(`\n🌍 Connection: Remote Cloudflare (${data.date})`);

  if (!SKIP_IMAGES && data.images.length > 0) {
    console.log(`📸 Uploading ${data.images.length} images to remote R2...`);
    for (const img of data.images) {
      const cmd = `wrangler r2 object put "${R2_BUCKET_NAME}/${img.r2Key}" --file="${img.localPath}"`;
      execSync(cmd, { stdio: 'ignore' });
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  console.log('💾 Generating and executing SQL on remote D1...');
  const sql = generateSql(data.date, data.products);
  const sqlPath = join(process.cwd(), `temp-upload-${data.date}.sql`);
  await writeFile(sqlPath, sql);

  try {
    const cmd = `wrangler d1 execute follow-db --remote --file="${sqlPath}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('   ✓ D1 Success');
  } catch (e) {
    console.error('\n❌ D1 Execution failed remotely.');
    throw e;
  }
}

// --- MAIN ---

async function main() {
  const DATA_ROOT = join(process.cwd(), 'data');

  console.log('\n🔍 Scanning for dates pending remote upload...');

  // 1. Get source dates
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

