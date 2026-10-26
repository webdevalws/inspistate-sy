import type { APIRoute } from 'astro';

// DEV SERVER ONLY: mock Google token endpoint (POST) and signing keys (GET) for testing the callback without a
// Google account (src/lib/google-dev-mock.ts). `astro build` replaces import.meta.env.DEV with false, so in
// production this route is a plain 404 and the mock module isn't bundled.
export const ALL: APIRoute = async ({ request }) => {
  if (import.meta.env.DEV) {
    const mock = await import('../../../lib/google-dev-mock');
    return request.method === 'POST' ? mock.mockToken(request) : mock.mockJwks();
  }
  return new Response('Not found', { status: 404 });
};
