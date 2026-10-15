import { BRAND } from '@/content/brand';
import { OG_SIZE, renderOgImage } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${BRAND.name}, ${BRAND.lab}, ${BRAND.university}`;

export default async function Image() {
  return renderOgImage({
    title: 'The city as an adaptive & dynamic system.',
    label: 'GeoAI network',
  });
}
