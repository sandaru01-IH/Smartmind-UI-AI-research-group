import type { MemberWork } from '@/lib/catalog/types';
import type { TeamLink } from './types';

/** Papers on the profile: the admin's count of earlier papers plus every paper linked on this site. */
export const isPaper = (w: MemberWork) => w.kind === 'paper';

/**
 * People who share a piece of work are connected automatically. A connection the admin drew by hand
 * between the same two people wins, so its label is kept.
 */
export function deriveLinks(
  works: Record<string, MemberWork[]>,
  manual: readonly TeamLink[],
): TeamLink[] {
  const pair = (a: string, b: string) => (a < b ? `${a}~${b}` : `${b}~${a}`);
  const have = new Set(manual.map((l) => pair(l.a, l.b)));
  const byWork = new Map<string, { title: string; people: string[] }>();
  for (const [member, list] of Object.entries(works))
    for (const w of list) {
      const e = byWork.get(w.key) ?? { title: w.title, people: [] };
      e.people.push(member);
      byWork.set(w.key, e);
    }
  const shared = new Map<string, { a: string; b: string; titles: string[] }>();
  for (const { title, people } of byWork.values())
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        const k = pair(people[i], people[j]);
        if (have.has(k)) continue;
        const e = shared.get(k) ?? { a: people[i], b: people[j], titles: [] };
        e.titles.push(title);
        shared.set(k, e);
      }
  return Array.from(shared.entries()).map(([k, e]) => ({
    id: `auto:${k}`,
    a: e.a,
    b: e.b,
    label: e.titles.length === 1 ? e.titles[0] : `${e.titles.length} shared works`,
  }));
}
