import { buildSearchIndex } from '@/lib/search-index';

/** Search index for the command palette. Loaded on first open, so it never bloats page HTML. */
export async function GET() {
  const entries = await buildSearchIndex();
  return Response.json(entries, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}
