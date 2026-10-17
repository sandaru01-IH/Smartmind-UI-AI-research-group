export interface PublicationFilters {
  q: string;
  year: number | 'all';
  venue: string | 'all';
}

interface Filterable {
  year: number;
  title: string;
  venue: string;
  authors?: string;
}

/** Case-insensitive search over title, venue and authors, plus exact year and venue filters. */
export function filterPublications<T extends Filterable>(
  items: readonly T[],
  f: PublicationFilters,
): T[] {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((p) => {
    if (f.year !== 'all' && p.year !== f.year) return false;
    if (f.venue !== 'all' && p.venue !== f.venue) return false;
    if (words.length === 0) return true;
    const hay = `${p.title} ${p.venue} ${p.authors ?? ''} ${p.year}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
