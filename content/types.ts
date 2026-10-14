/**
 * 'confirmed': supported by a source this.md opened in full, or by the university pages.
 * 'tbc': this.md flags it as unconfirmed (LinkedIn or search snippet only, or unclear ownership).
 * 'tbc' items never appear on the home page or in the numbers strip.
 */
export type Confirmation = 'confirmed' | 'tbc';

export interface Sourced {
  confirmation: Confirmation;
  /** Where in this.md the item comes from (section name). */
  source: string;
}

export const isConfirmed = <T extends Sourced>(item: T): boolean =>
  item.confirmation === 'confirmed';
export const confirmedOnly = <T extends Sourced>(items: readonly T[]): T[] =>
  items.filter(isConfirmed);

export type ThemeId = 'land' | 'flood' | 'traffic' | 'ai';
