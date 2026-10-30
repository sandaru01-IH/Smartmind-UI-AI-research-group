export const HOME_SECTION_IDS = ['video', 'medium', 'blog'] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export type HomeSections = Record<HomeSectionId, boolean>;

export const HOME_SECTION_LABELS: Record<HomeSectionId, { title: string; blurb: string }> = {
  video: { title: 'Our latest video', blurb: 'The newest video from the YouTube channel.' },
  medium: { title: 'Latest on Medium', blurb: 'The newest visible Medium articles.' },
  blog: { title: 'Latest from the community', blurb: 'The newest published blog posts.' },
};
