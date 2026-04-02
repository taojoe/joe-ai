import { readFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { getPlatformProxy } from 'wrangler';

interface ImageMetadata {
  localPath: string;
  r2Key: string;
}

// --- CONFIG ---
const ARGS = process.argv.slice(2);
const DATE_ARG = ARGS.find((arg) => arg.startsWith('--date='));
const IS_LOCAL = ARGS.includes('--local');
const IS_REMOTE = ARGS.includes('--remote');
const SKIP_IMAGES = ARGS.includes('--skip-images');

if (!DATE_ARG || (!IS_LOCAL && !IS_REMOTE)) {
  console.error('Usage: npx tsx scripts/upload.ts --date=YYYY-MM-DD [--local|--remote] [--skip-images]');
  process.exit(1);
}

const DATE = DATE_ARG.split('=')[1];
const R2_BUCKET_NAME = 'follow-assets';
const SQL_PATH = join(process.cwd(), `upload-${DATE}.sql`);
const IMAGES_JSON_PATH = join(process.cwd(), `images-${DATE}.json`);

// --- HANDLERS ---

async function handleLocalUpload(images: ImageMetadata[]) {
  console.log('\n🔗 Connection: Local Development Proxy');
  const { env } = await getPlatformProxy();
  const assets = env.FOLLOW_ASSETS as any;

  if (!SKIP_IMAGES && images.length > 0) {
    console.log(`📸 Uploading ${images.length} images to local R2...`);
    for (const img of images) {
      const content = await readFile(img.localPath);
      await assets.put(img.r2Key, content);
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  console.log('💾 Executing SQL on local D1...');
  try {
    const cmd = `wrangler d1 execute follow-db --local --file="${SQL_PATH}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('   ✓ D1 Success');
  } catch (e) {
    console.error('\n❌ D1 Execution failed locally.');
  }
}

async function handleRemoteUpload(images: ImageMetadata[]) {
  console.log('\n🌍 Connection: Remote Cloudflare');

  if (!SKIP_IMAGES && images.length > 0) {
    console.log(`📸 Uploading ${images.length} images to remote R2...`);
    for (const img of images) {
      const cmd = `wrangler r2 object put "${R2_BUCKET_NAME}/${img.r2Key}" --file="${img.localPath}"`;
      execSync(cmd, { stdio: 'ignore' });
      process.stdout.write('.');
    }
    console.log('\n   ✓ R2 Success');
  }

  console.log('💾 Executing SQL on remote D1...');
  try {
    const cmd = `wrangler d1 execute follow-db --remote --file="${SQL_PATH}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('   ✓ D1 Success');
  } catch (e) {
    console.error('\n❌ D1 Execution failed remotely.');
  }
}

// --- MAIN ---

async function main() {
  console.log('\n📦 Product Hunt Upload Script');
  console.log('─'.repeat(50));
  console.log(`   Date: ${DATE}`);
  console.log(`   Mode: ${IS_LOCAL ? 'LOCAL' : 'REMOTE'}`);
  console.log('─'.repeat(50));

  // 1. Check for prepared files
  try {
    await readFile(SQL_PATH);
  } catch (e) {
    console.error(`❌ SQL file not found: ${SQL_PATH}\n   Please run scripts/prepare.ts first.`);
    process.exit(1);
  }

  let images: ImageMetadata[] = [];
  try {
    const imagesData = await readFile(IMAGES_JSON_PATH, 'utf-8');
    images = JSON.parse(imagesData);
  } catch (e) {
    if (!SKIP_IMAGES) {
      console.warn(`⚠️  Image manifest not found: ${IMAGES_JSON_PATH}`);
    }
  }

  // 2. Perform Upload
  if (IS_LOCAL) {
    await handleLocalUpload(images);
  } else {
    await handleRemoteUpload(images);
  }

  console.log('\n✨ Upload process finished!\n');
}

main().catch(console.error);


