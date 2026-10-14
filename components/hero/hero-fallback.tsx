import { depthField, FALLBACK_SIZE, layerTransform } from '@/lib/sim/static-network';
import { t } from '@/content/strings';
import { dotGroups } from '@/lib/svg-dots';

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Static depth stack. Painted on the server, so the hero has its networks before any script runs,
 * and this is the whole picture under reduced motion. The canvas draws floods and agents on these
 * same sheets; it does not add a second set of roads.
 */
export function HeroFallback() {
  const field = depthField();
  return (
    <svg
      role="img"
      aria-label={t.hero.fallbackLabel}
      viewBox={`0 0 ${FALLBACK_SIZE.width} ${FALLBACK_SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {field.map(({ spec, graph, centrality }) => {
        const roads = graph.edges
          .map(
            (e) =>
              `M${round(graph.nodes[e.a].x)} ${round(graph.nodes[e.a].y)}L${round(graph.nodes[e.b].x)} ${round(graph.nodes[e.b].y)}`,
          )
          .join('');
        const nodes = graph.nodes.map((n, i) => ({
          x: round(n.x),
          y: round(n.y),
          // Divide by scale so a farther, larger sheet keeps the same stroke weight on screen.
          r: round((0.32 + 1.25 * Math.pow(centrality[i], 0.6)) / spec.scale),
        }));
        return (
          <g key={spec.id} transform={layerTransform(spec)}>
            <path
              d={roads}
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth={round(0.2 / spec.scale)}
              strokeLinecap="round"
              opacity={spec.road}
            />
            {dotGroups(nodes).map((g) => (
              <path
                key={g.r}
                d={g.d}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={g.r * 2}
                strokeLinecap="round"
                opacity={spec.node}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
