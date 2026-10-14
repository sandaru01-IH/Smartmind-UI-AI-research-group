import { FALLBACK_SIZE, staticNetwork } from '@/lib/sim/static-network';
import { t } from '@/content/strings';

/**
 * Static road network. Always rendered, so the hero has a picture before any script runs,
 * and it is the final picture under reduced motion.
 */
export function HeroFallback() {
  const { roads, nodes } = staticNetwork();
  return (
    <svg
      role="img"
      aria-label={t.hero.fallbackLabel}
      viewBox={`0 0 ${FALLBACK_SIZE.width} ${FALLBACK_SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <path
        d={roads}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="0.22"
        strokeLinecap="round"
        opacity="0.55"
      />
      <g fill="var(--muted)" opacity="0.8">
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} />
        ))}
      </g>
    </svg>
  );
}
