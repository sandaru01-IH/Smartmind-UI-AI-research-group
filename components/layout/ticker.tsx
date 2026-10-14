import { getLatestUpdates } from '@/lib/posts/public';
import { TickerView } from './ticker-view';

/** Newest short updates for the ticker. Cached and tagged, refreshed when an admin publishes. */
export async function Ticker() {
  const updates = await getLatestUpdates(8);
  const items = updates.map((u) => ({
    id: u.id,
    title: u.title,
    category: u.category,
    href: u.link_url ?? (u.type === 'article' ? `/news/${u.slug}` : null),
    external: Boolean(u.link_url),
    date: u.published_at,
  }));
  return <TickerView items={items} />;
}
