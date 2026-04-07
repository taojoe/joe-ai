import { fetchTrendingRepos } from './fetch-projects.js';
import { parseProject, formatToMarkdown } from './parse-project.js';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'skills/github-daily/config.json'), 'utf8'));

async function run() {
  console.log('--- Starting GitHub Daily AI Hunter ---');
  
  const topics = config.source.params.topics;
  const outputDir = path.resolve(process.cwd(), 'skills/github-daily', config.output.dir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const repos = await fetchTrendingRepos(topics);
    console.log(`Found ${repos.length} unique trending repositories.`);

    for (const repo of repos) {
      console.log(`Processing: ${repo.full_name}...`);
      const parsedData = await parseProject(repo);
      const markdown = formatToMarkdown(parsedData);
      
      const fileName = `${new Date().toISOString().split('T')[0]}-${repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      const filePath = path.join(outputDir, fileName);
      
      fs.writeFileSync(filePath, markdown);
      console.log(`Saved: ${fileName}`);
    }

    console.log('--- GitHub Daily AI Hunter Finished ---');
  } catch (error) {
    console.error('Fatal execution error:', error.message);
    process.exit(1);
  }
}

run();
