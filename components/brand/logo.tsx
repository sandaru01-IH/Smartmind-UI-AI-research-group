import Image from 'next/image';
import { BRAND } from '@/content/brand';

/**
 * The official Smartmind logo (SMARTMIND_logo_pack). The full-colour lockup carries dark lettering,
 * so on the dark theme the all-white lockup takes its place. Both are in the page; CSS shows the one
 * that matches the theme (see .brand-on-light and .brand-on-dark in globals.css), so there is no
 * flash and no script.
 */

/** The hexagon mark alone. Its colours read well on both themes. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/icon-color.png"
      alt=""
      width={216}
      height={256}
      loading="eager"
      className={className}
      style={{ height: size, width: 'auto' }}
    />
  );
}

/** Mark and name together, as one lockup. `size` is the height in pixels. */
export function Wordmark({ size = 44 }: { size?: number }) {
  const common = {
    height: 240,
    loading: 'eager' as const,
    style: { height: size, width: 'auto' },
  };
  return (
    <span className="inline-flex items-center">
      <Image
        src="/brand/logo-color.png"
        alt={BRAND.name}
        width={625}
        className="brand-on-light"
        {...common}
      />
      <Image
        src="/brand/logo-white.png"
        alt={BRAND.name}
        width={686}
        className="brand-on-dark"
        {...common}
      />
    </span>
  );
}
