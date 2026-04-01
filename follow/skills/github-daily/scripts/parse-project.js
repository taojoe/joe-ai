import { fetchReadme } from '../utils/github-client.js';

/**
 * Parse project details and extrat highlights.
 */
export async function parseProject(repo) {
  const [owner, name] = repo.full_name.split('/');
  let readmeContent = '';
  let highlights = [];

  try {
    readmeContent = await fetchReadme(owner, name);
    highlights = extractHighlights(readmeContent);
  } catch (error) {
    console.warn(`Could not fetch README for ${repo.full_name}. Using repository description.`);
    highlights = [repo.description || 'No description provided.'];
  }

  // Determine category based on topics and content
  const categories = determineCategories(repo, readmeContent);

  return {
    title: repo.name,
    fullName: repo.full_name,
    link: repo.html_url,
    stars: repo.stargazers_count,
    description: repo.description,
    categories,
    highlights,
    date: new Date().toISOString().split('T')[0],
  };
}

/**
 * Basic logic to extract 3 key highlights from README.
 */
function extractHighlights(content) {
  const lines = content.split('\n');
  const highlights = [];
  
  // Find first 3 non-empty list items or short sentences
  for (const line of lines) {
    const trimmed = line.trim();
    // Match Markdown list items (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      highlights.push(trimmed.replace(/^[-*]\s+/, ''));
    }
    if (highlights.length >= 3) break;
  }

  // If no lists, take the first 2-3 sentences of the first non-empty paragraph
  if (highlights.length === 0) {
    for (const paragraph of lines) {
      if (paragraph.trim().length > 30 && !paragraph.startsWith('#')) {
        highlights.push(paragraph.trim().split('. ')[0] + '.');
        break;
      }
    }
  }

  return highlights.length > 0 ? highlights : ['Check the project on GitHub for more details.'];
}

/**
 * Determine AI sub-categories.
 */
function determineCategories(repo, content) {
  const topics = repo.topics || [];
  const text = (repo.description + ' ' + content).toLowerCase();
  const categories = new Set();

  if (topics.includes('ai-agents') || text.includes('agent')) categories.add('Agents');
  if (topics.includes('llm') || text.includes('large language model') || text.includes('llama')) categories.add('LLM');
  if (topics.includes('rag') || text.includes('retrieval augmented generation')) categories.add('RAG');
  if (topics.includes('product') || text.includes('ui') || text.includes('dashboard')) categories.add('Product');

  return Array.from(categories);
}

/**
 * Format project into local markdown.
 */
export function formatToMarkdown(data) {
  return `---
title: "${data.title}"
link: "${data.link}"
stars: ${data.stars}
categories: ${JSON.stringify(data.categories)}
date: "${data.date}"
---

# ${data.fullName}

> ${data.description || 'No project description.'}

## 🔥 Key Highlights
${data.highlights.map(h => `- ${h}`).join('\n')}

---
[View on GitHub](${data.link})
`;
}
