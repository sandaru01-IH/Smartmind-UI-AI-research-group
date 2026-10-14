'use client';

import { useEffect, useRef, useState } from 'react';
import { ARCHITECTURE } from '@/content/chatbots';

/**
 * Architecture of the 2026 participatory chatbot, drawn only from components named in this.md:
 * WhatsApp channel, language agent, live-weather API agent, scheduler agent, and the two audiences
 * (residents and planners). Lines draw in once when the diagram scrolls into view; packets make one
 * pass along each route. Nothing loops. Under reduced motion the finished diagram is shown.
 */
export function ArchitectureDiagram() {
  const ref = useRef<SVGSVGElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      setRun(false);
      el.dataset.static = 'true';
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [lang, weather, scheduler] = ARCHITECTURE.agents;
  const [residents, planners] = ARCHITECTURE.outputs;

  const routes = [
    { id: 'in', d: 'M170 210 H280', delay: 0 },
    { id: 'lang', d: 'M420 210 H470', delay: 0.4 },
    { id: 'weather', d: 'M470 210 V120 H520', delay: 0.8 },
    { id: 'scheduler', d: 'M470 210 V300 H520', delay: 0.8 },
    { id: 'to-res', d: 'M700 120 H780 V150 H800', delay: 1.2 },
    { id: 'to-plan', d: 'M700 300 H780 V270 H800', delay: 1.2 },
  ];

  const box = 'fill-surface stroke-line-strong';
  const label = 'fill-fg font-sans text-[15px] font-semibold';
  const note = 'fill-muted font-mono text-[11px] uppercase tracking-wider';

  return (
    <figure>
      <svg
        ref={ref}
        data-run={run}
        viewBox="0 0 1000 420"
        role="img"
        aria-labelledby="arch-title arch-desc"
        className="w-full [--dur:400ms] data-[static=true]:[&_*]:!animate-none"
      >
        <title id="arch-title">Architecture of the participatory flood and landslide chatbot</title>
        <desc id="arch-desc">
          Residents and planners reach the chatbot through WhatsApp. A multi-agent design with a language agent, a live-weather
          API agent and a scheduler agent produces preparedness guidance for residents and risk-sensitive zoning insight for planners.
        </desc>
        <style>{`
          .route{fill:none;stroke:var(--line-strong);stroke-width:1.5;stroke-dasharray:var(--len,400);stroke-dashoffset:0}
          [data-run='true'] .route{animation:draw var(--dur) var(--ease-out-signal) both;animation-delay:var(--d)}
          [data-run='true'] .node{animation:rise var(--dur) var(--ease-out-signal) both;animation-delay:var(--d)}
          [data-run='true'] .packet{animation:travel 900ms var(--ease-out-signal) both;animation-delay:calc(var(--d) + 0.4s)}
          .packet{fill:var(--signal);opacity:0;offset-rotate:0deg}
          @keyframes draw{from{stroke-dashoffset:var(--len,400)}to{stroke-dashoffset:0}}
          @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          @keyframes travel{0%{offset-distance:0%;opacity:1}90%{opacity:1}100%{offset-distance:100%;opacity:0}}
          @media (prefers-reduced-motion:reduce){.route,.node,.packet{animation:none!important}.packet{display:none}}
        `}</style>

        {routes.map((r) => (
          <g key={r.id} style={{ '--d': `${r.delay}s`, '--len': 420 } as React.CSSProperties}>
            <path className="route" d={r.d} />
            <circle className="packet" r="4" style={{ offsetPath: `path("${r.d}")` }} />
          </g>
        ))}

        {/* Channel */}
        <g className="node" style={{ '--d': '0s' } as React.CSSProperties}>
          <rect x="20" y="170" width="150" height="80" rx="2" className={box} />
          <text x="95" y="208" textAnchor="middle" className={label}>
            {ARCHITECTURE.channel}
          </text>
          <text x="95" y="228" textAnchor="middle" className={note}>
            channel
          </text>
        </g>

        {/* Language agent */}
        <g className="node" style={{ '--d': '0.3s' } as React.CSSProperties}>
          <rect x="280" y="170" width="140" height="80" rx="2" className={box} />
          <text x="350" y="208" textAnchor="middle" className={label}>
            {lang.label}
          </text>
          <text x="350" y="228" textAnchor="middle" className={note}>
            {lang.note}
          </text>
        </g>

        {/* Multi-agent group frame */}
        <rect x="470" y="70" width="240" height="290" rx="2" fill="none" stroke="var(--line-strong)" strokeDasharray="4 6" />
        <text x="480" y="62" className={note}>
          multi-agent design
        </text>

        <g className="node" style={{ '--d': '0.8s' } as React.CSSProperties}>
          <rect x="520" y="90" width="180" height="60" rx="2" className={box} />
          <text x="610" y="116" textAnchor="middle" className={label}>
            {weather.label}
          </text>
          <text x="610" y="136" textAnchor="middle" className={note}>
            {weather.note}
          </text>
        </g>
        <g className="node" style={{ '--d': '0.8s' } as React.CSSProperties}>
          <rect x="520" y="270" width="180" height="60" rx="2" className={box} />
          <text x="610" y="296" textAnchor="middle" className={label}>
            {scheduler.label}
          </text>
          <text x="610" y="316" textAnchor="middle" className={note}>
            {scheduler.note}
          </text>
        </g>

        {/* Outputs */}
        <g className="node" style={{ '--d': '1.2s' } as React.CSSProperties}>
          <rect x="800" y="110" width="180" height="80" rx="2" className={box} stroke="var(--flood)" />
          <text x="890" y="146" textAnchor="middle" className={label}>
            {residents.label}
          </text>
          <text x="890" y="166" textAnchor="middle" className={note}>
            {residents.note}
          </text>
        </g>
        <g className="node" style={{ '--d': '1.2s' } as React.CSSProperties}>
          <rect x="800" y="230" width="180" height="80" rx="2" className={box} stroke="var(--landslide)" />
          <text x="890" y="266" textAnchor="middle" className={label}>
            {planners.label}
          </text>
          <text x="890" y="286" textAnchor="middle" className={note}>
            {planners.note}
          </text>
        </g>
      </svg>
      <figcaption className="label-mono mt-4 text-muted">
        Source: this.md, {ARCHITECTURE.source}.
      </figcaption>
    </figure>
  );
}
