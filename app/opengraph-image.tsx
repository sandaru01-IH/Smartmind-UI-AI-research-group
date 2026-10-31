import { BRAND } from '@/content/brand';
import { IDENTITY } from '@/content/philosophy';
import { OG_SIZE, renderOgImage } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${BRAND.name}, ${BRAND.lab}, ${BRAND.university}`;

export default async function Image() {
  return renderOgImage({
    title: IDENTITY.line,
    label: 'GeoAI network',
  });
}
