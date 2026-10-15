import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND } from '@/content/brand';

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** 1200x630 social card in the site's visual language: ink background, lime signal, mono label. */
export async function renderOgImage({ title, label }: { title: string; label: string }) {
  const logo = await readFile(path.join(process.cwd(), 'public/brand/logo-white.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const lines = title.length > 90 ? `${title.slice(0, 88).trimEnd()}…` : title;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#090D12',
        color: '#F2EFE8',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" height={64} width={183} style={{ height: 64, width: 183 }} />
        <div
          style={{
            fontSize: 22,
            color: '#8FA3B5',
            marginLeft: 16,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: lines.length > 50 ? 64 : 84,
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: -2,
          maxWidth: 1000,
        }}
      >
        {lines}
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#8FA3B5' }}
      >
        <div>{`${BRAND.lab}, ${BRAND.university}`}</div>
        <div style={{ color: '#C6FF3D' }}>{BRAND.tagline}</div>
      </div>
    </div>,
    OG_SIZE,
  );
}
