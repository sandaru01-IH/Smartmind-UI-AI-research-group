import { BRAND } from '@/content/brand';
import { OG_SIZE, renderOgImage } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${BRAND.name}, ${BRAND.lab}, ${BRAND.university}`;

export default function Image() {
  return renderOgImage({ title: 'The city as a system of systems.', label: 'GeoAI network' });
}
