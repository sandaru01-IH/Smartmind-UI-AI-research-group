const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** 4 → "four", 14 → "14". Small counts read better as words in headlines. */
export const numberWord = (n: number): string => WORDS[n] ?? String(n);

/** "Four" for the start of a sentence or title. */
export const numberWordCap = (n: number): string => {
  const w = numberWord(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};

export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;
