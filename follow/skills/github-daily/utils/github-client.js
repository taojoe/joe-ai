/**
 * GitHub API Client for fetching trending repositories.
 */
export async function githubFetch(endpoint, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const baseUrl = 'https://api.github.com';
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'joe-ai-follow-skill',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetch README content for a repository.
 */
export async function fetchReadme(owner, repo) {
  const readme = await githubFetch(`/repos/${owner}/${repo}/readme`);
  // GitHub returns readme content in base64
  const content = Buffer.from(readme.content, 'base64').toString('utf8');
  return content;
}
