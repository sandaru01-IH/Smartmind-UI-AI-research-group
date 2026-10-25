import { describe, expect, it } from 'vitest';
import { PARTNERS } from './partners';
import { AWARDS } from './awards';
import { TEAM } from './team';
import { LAB_PAPERS, ALL_PUBLICATIONS } from './publications';
import { MILESTONES } from './chatbots';
import { SRC_FUNDED_COUNT } from './research';
import { confirmedOnly } from './types';

describe('starter content traces to this.md', () => {
  it('counts only confirmed awards', () => {
    expect(AWARDS.length).toBe(9);
    expect(AWARDS.filter((a) => a.confirmation === 'tbc').map((a) => a.year)).toEqual([2025, 2024]);
  });
});

describe('content integrity', () => {
  it('lists nine national and eight international partners', () => {
    expect(PARTNERS.filter((p) => p.kind === 'national')).toHaveLength(9);
    expect(PARTNERS.filter((p) => p.kind === 'international')).toHaveLength(8);
  });
  it('has twelve lab papers spanning 2019 to 2021, each with a link', () => {
    expect(LAB_PAPERS).toHaveLength(12);
    expect(
      LAB_PAPERS.every((p) => p.year >= 2019 && p.year <= 2021 && p.href?.startsWith('https://')),
    ).toBe(true);
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
    expect(
      all.every(
        (i) => i.source.length > 0 && (i.confirmation === 'confirmed' || i.confirmation === 'tbc'),
      ),
    ).toBe(true);
  });
});
