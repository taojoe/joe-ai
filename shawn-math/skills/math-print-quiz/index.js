import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { generateHTML } from './template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'output/math-print-quiz');

async function main() {
  // Get the quiz name from command line args
  const args = process.argv.slice(2);
  const quizName = args[0];

  if (!quizName) {
    console.error('❌ 请指定要生成的练习名称');
    console.error('   用法: bun run quiz -- <quiz-name>');
    console.error('   例如: bun run quiz -- difference-of-squares');
    
    // List available quizzes
    const dataDir = path.resolve(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        console.error('\n   可用的练习:');
        files.forEach(f => {
          console.error(`     - ${f.replace('.json', '')}`);
        });
      }
    }
    process.exit(1);
  }

  // Load the quiz data
  const dataPath = path.resolve(__dirname, 'data', `${quizName}.json`);
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ 找不到数据文件: ${dataPath}`);
    process.exit(1);
  }

  console.log(`📖 加载数据: ${quizName}.json`);
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Generate HTML
  console.log('🎨 生成 HTML 模板...');
  const html = generateHTML(data);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save HTML for debugging (optional)
  const htmlPath = path.resolve(OUTPUT_DIR, `${quizName}.html`);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`📄 HTML 已保存: ${htmlPath}`);

  // Generate PDF using Puppeteer
  console.log('🖨️  启动浏览器，生成 PDF...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Load HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Ensure all fonts (including KaTeX) are loaded before generating PDF
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    // Wait for KaTeX rendering to complete
    await page.waitForSelector('.katex', { timeout: 10000 }).catch(() => {
      console.warn('⚠️  未检测到 KaTeX 渲染元素，可能没有数学公式');
    });

    // Generate PDF
    const pdfPath = path.resolve(OUTPUT_DIR, `${quizName}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '18mm',
        right: '18mm',
      },
    });

    console.log(`✅ PDF 已生成: ${pdfPath}`);
    console.log(`\n📊 练习概要:`);
    console.log(`   标题: ${data.title}`);
    console.log(`   题目数量: ${data.questions.length}`);
    console.log(`   题目类型: ${[...new Set(data.questions.map(q => q.type))].join(', ')}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
