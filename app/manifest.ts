import type { MetadataRoute } from 'next';
import { BRAND } from '@/content/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name}, ${BRAND.lab}`,
    short_name: BRAND.name,
    description: BRAND.pitch,
    start_url: '/',
    display: 'browser',
    background_color: '#090D12',
    theme_color: '#090D12',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
