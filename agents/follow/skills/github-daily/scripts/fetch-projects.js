import { githubFetch } from '../utils/github-client.js';

/**
 * Fetch repositories based on topics.
 */
export async function fetchTrendingRepos(topics) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const allRepos = [];
  const seenRepos = new Set();

  for (const topic of topics) {
    console.log(`Fetching trending repos for topic: ${topic}...`);
    try {
      const query = `topic:${topic} pushed:>${yesterday} sort:stars-desc`;
      const data = await githubFetch(`/search/repositories?q=${encodeURIComponent(query)}&per_page=10`);
      
      data.items.forEach(repo => {
        if (!seenRepos.has(repo.full_name)) {
          allRepos.push(repo);
          seenRepos.add(repo.full_name);
        }
      });
    } catch (error) {
      console.error(`Error fetching topic ${topic}:`, error.message);
    }
  }

  // Deduplicate and re-sort by stars
  return allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
}
