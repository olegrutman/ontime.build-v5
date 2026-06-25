import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, fmtSigned } from '@/components/shared/KpiCard';
import type { HealthStatus } from '@/components/project/overview/ProjectHealthHero';

interface CompactHealthHeroProps {
  status: HealthStatus;
  projectedMargin: number;
  projectedMarginPct: number;
  label?: string;
  summary: string;
}

const STATUS_STYLE: Record<HealthStatus, { bg: string; color: string; border: string; label: string }> = {
  green: { bg: C.greenBg, color: C.green, border: C.green, label: 'On Track' },
  amber: { bg: C.yellowBg, color: C.yellow, border: C.yellow, label: 'Watch' },
  red: { bg: C.redBg, color: C.red, border: C.red, label: 'At Risk' },
  neutral: { bg: C.surface2, color: C.muted, border: C.border, label: 'Awaiting Data' },
};

export function CompactHealthHero({
  status,
  projectedMargin,
  projectedMarginPct,
  label = 'Projected Margin',
  summary,
}: CompactHealthHeroProps) {
  const s = STATUS_STYLE[status];
  const Icon = status === 'green' ? TrendingUp : status === 'red' ? TrendingDown : Minus;
  const pctRounded = Math.round(projectedMarginPct);

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${s.border}`,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
        ...fontLabel,
      }}
    >
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          background: s.bg, color: s.color,
          fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
          border: `1px solid ${s.color}33`,
          flexShrink: 0,
        }}
      >
        <Icon size={11} />
        {s.label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontSize: '1.4rem', color: C.ink, lineHeight: 1, ...fontVal }}>
          {fmtSigned(projectedMargin)}
        </span>
        <span style={{ fontSize: '0.82rem', color: s.color, ...fontMono }}>
          {pctRounded >= 0 ? '+' : ''}{pctRounded}%
        </span>
      </div>

      <p
        className="hidden sm:block"
        style={{ fontSize: '0.76rem', color: C.muted, lineHeight: 1.4, margin: 0, flex: 1, minWidth: 220 }}
      >
        {summary}
      </p>

    </div>
  );
}
