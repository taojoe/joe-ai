import { logger } from '../utils/logger.js';
import { fetchWithRetry } from '../utils/http-client.js';

const TOKEN_URL = 'https://api.producthunt.com/v2/oauth/token';
const GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';

/**
 * 交换 Access Token
 */
async function getAccessToken() {
  const clientId = process.env.PH_CLIENT_ID;
  const clientSecret = process.env.PH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PH_CLIENT_ID or PH_CLIENT_SECRET is missing in .env');
  }

  logger.info('Authenticating with Product Hunt API...');

  const response = await fetchWithRetry(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  }, { retries: 2, timeout: 10000 });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 获取每日产品
 */
export async function fetchDailyPosts(dateStr) {
  const token = await getAccessToken();

  // 构造查询范围：该日期的 00:00:00 到 23:59:59 (UTC)
  const postedAfter = `${dateStr}T00:00:00Z`;
  const postedBefore = `${dateStr}T23:59:59Z`;

  const query = `
    query ($after: DateTime, $before: DateTime) {
      posts(
        first: 20,
        postedAfter: $after,
        postedBefore: $before,
        featured: true,
        order: VOTES
      ) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            website
            votesCount
            createdAt
            featuredAt
            slug
            thumbnail {
              type
              url
            }
            media {
              type
              url
              videoUrl
            }
            topics {
              edges {
                node {
                  name
                  slug
                }
              }
            }
            makers {
              name
              username
              url
            }
          }
        }
      }
    }
  `;

  logger.info(`Fetching featured posts for ${dateStr}...`);

  const response = await fetchWithRetry(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: {
        after: postedAfter,
        before: postedBefore
      }
    })
  }, { retries: 3, timeout: 20000 });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL Errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data.posts.edges.map(edge => edge.node);
}
