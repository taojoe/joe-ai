import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;

  if (!path) {
    return new Response('Missing path', { status: 400 });
  }

  try {
    const object = await env.FOLLOW_ASSETS.get(path);

    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching from R2:', error);
    return new Response('Internal error', { status: 500 });
  }
};
