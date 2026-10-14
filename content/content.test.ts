import { describe, expect, it } from 'vitest';
import { NUMBERS } from './numbers';
import { PARTNERS } from './partners';
import { AWARDS } from './awards';
import { TEAM } from './team';
import { LAB_PAPERS, ALL_PUBLICATIONS } from './publications';
import { MILESTONES } from './chatbots';
import { SRC_FUNDED_COUNT } from './research';
import { confirmedOnly } from './types';

const stat = (id: string) => NUMBERS.find((n) => n.id === id)?.value;

describe('numbers strip traces to this.md', () => {
  it('matches the figures in this.md', () => {
    expect(stat('papers')).toBe(12);
    expect(stat('team')).toBe(8);
    expect(stat('themes')).toBe(4);
    expect(stat('awards')).toBe(7);
    expect(stat('partners')).toBe(14);
  });
  it('gives every figure a source note', () => {
    expect(NUMBERS.every((n) => n.source.includes('this.md'))).toBe(true);
  });
  it('counts only confirmed awards', () => {
    expect(AWARDS.length).toBe(9);
    expect(AWARDS.filter((a) => a.confirmation === 'tbc').map((a) => a.year)).toEqual([2025, 2024]);
  });
});

describe('content integrity', () => {
  it('lists seven national and seven international partners', () => {
    expect(PARTNERS.filter((p) => p.kind === 'national')).toHaveLength(7);
    expect(PARTNERS.filter((p) => p.kind === 'international')).toHaveLength(7);
  });
  it('has twelve lab papers spanning 2019 to 2021, each with a link', () => {
    expect(LAB_PAPERS).toHaveLength(12);
    expect(LAB_PAPERS.every((p) => p.year >= 2019 && p.year <= 2021 && p.href?.startsWith('https://'))).toBe(true);
  });
  it('flags the unverified PLoS ONE paper', () => {
    const plos = ALL_PUBLICATIONS.find((p) => p.venue === 'PLoS ONE');
    expect(plos?.confirmation).toBe('tbc');
  });
  it('has six chatbot milestones, with the two LinkedIn-sourced ones flagged', () => {
    expect(MILESTONES).toHaveLength(6);
    expect(confirmedOnly(MILESTONES)).toHaveLength(4);
    expect(MILESTONES.filter((m) => m.confirmation === 'tbc').map((m) => m.id)).toEqual([
      'icsd-2025',
      'street-cloud-2026',
    ]);
  });
  it('has four SRC-funded projects', () => {
    expect(SRC_FUNDED_COUNT).toBe(4);
  });
  it('names the eight core members from this.md', () => {
    expect(TEAM.filter((p) => p.group === 'core').map((p) => p.name)).toEqual([
      'Amila Jayasinghe',
      'Chethika Abenayake',
      'Niroshan Sanjaya',
      'Sandaruwan Sankalpa (Silva)',
      'Farasath Hasan',
      'Lahiru Kaveesha',
      'Sahan Sathsarana',
      'Malith Deshan',
    ]);
  });
  it('gives every sourced item a source and a confirmation', () => {
    const all = [...AWARDS, ...TEAM, ...PARTNERS, ...MILESTONES, ...ALL_PUBLICATIONS];
    expect(all.every((i) => i.source.length > 0 && (i.confirmation === 'confirmed' || i.confirmation === 'tbc'))).toBe(true);
  });
});
