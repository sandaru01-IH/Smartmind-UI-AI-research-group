/** Social and academic profiles a person can list. Plain data, safe for server and browser. */
export const SOCIAL_PLATFORMS = [
  'linkedin',
  'facebook',
  'x',
  'instagram',
  'github',
  'youtube',
  'scholar',
  'researchgate',
  'orcid',
  'website',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
  youtube: 'YouTube',
  scholar: 'Google Scholar',
  researchgate: 'ResearchGate',
  orcid: 'ORCID',
  website: 'Website',
};

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
