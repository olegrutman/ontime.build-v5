import { useEffect, useState } from 'react';
import { RING_CHART_DATA } from './mockData';

const SIZE = 160;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BudgetRingChart() {
  const [animated, setAnimated] = useState(false);
  const total = RING_CHART_DATA.reduce((s, d) => s + d.value, 0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        {RING_CHART_DATA.map((segment, i) => {
          const pct = segment.value / total;
          const dashLen = CIRCUMFERENCE * pct;
          const offset = CIRCUMFERENCE * accumulated;
          accumulated += pct;
          return (
            <circle
              key={segment.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dashLen} ${CIRCUMFERENCE - dashLen}`}
              strokeDashoffset={animated ? -offset : CIRCUMFERENCE}
              strokeLinecap="butt"
              style={{
                transition: `stroke-dashoffset 800ms cubic-bezier(.22,1,.36,1)`,
                transitionDelay: `${200 + i * 200}ms`,
              }}
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
        {RING_CHART_DATA.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-[11px] text-white/50">{d.label}</span>
            <span className="text-[11px] text-white/80 ml-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              ${(d.value / 1000).toFixed(0)}K
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
