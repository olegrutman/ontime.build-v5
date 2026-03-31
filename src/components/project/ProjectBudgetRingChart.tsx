import { useEffect, useState } from 'react';
import { DT } from '@/lib/design-tokens';
import { formatCurrency as fmt } from '@/lib/utils';

interface RingSegment {
  label: string;
  value: number;
  color: string;
}

interface ProjectBudgetRingChartProps {
  paid: number;
  pending: number;
  remaining: number;
}

export function ProjectBudgetRingChart({ paid, pending, remaining }: ProjectBudgetRingChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const total = paid + pending + remaining;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
        No budget data yet
      </div>
    );
  }

  const segments: RingSegment[] = [
    { label: 'Paid', value: paid, color: 'hsl(var(--chart-2))' },
    { label: 'Pending', value: pending, color: 'hsl(var(--chart-4))' },
    { label: 'Remaining', value: remaining, color: 'hsl(var(--chart-1))' },
  ].filter(s => s.value > 0);

  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += dashLen;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={mounted ? -offset : circumference}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
            />
          );
        })}
        {/* Center text */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center fill-foreground"
          style={{ ...DT.mono, fontSize: '13px', fontWeight: 600 }}
        >
          {Math.round((paid / total) * 100)}%
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] text-muted-foreground">{seg.label}</span>
            <span className="text-[10px] font-medium" style={DT.mono}>{fmt(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
