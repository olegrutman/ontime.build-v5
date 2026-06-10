import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, fmt, fmtSigned } from '@/components/shared/KpiCard';

export type HealthStatus = 'green' | 'amber' | 'red' | 'neutral';

interface ProjectHealthHeroProps {
  status: HealthStatus;
  projectedMargin: number;
  projectedMarginPct: number;
  /** Headline noun for the value, e.g. "Projected Margin". */
  label?: string;
  /** One-sentence health summary shown next to status pill. */
  summary: string;
  /** Optional supporting line under the big number. */
  detail?: ReactNode;
  /** Optional right-side mini stats (label + value pairs). */
  miniStats?: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }[];
}

const STATUS_STYLE: Record<HealthStatus, { bg: string; color: string; border: string; label: string }> = {
  green: { bg: C.greenBg, color: C.green, border: C.green, label: 'On Track' },
  amber: { bg: C.yellowBg, color: C.yellow, border: C.yellow, label: 'Needs Attention' },
  red: { bg: C.redBg, color: C.red, border: C.red, label: 'At Risk' },
  neutral: { bg: C.surface2, color: C.muted, border: C.border, label: 'Awaiting Data' },
};

export function ProjectHealthHero({
  status,
  projectedMargin,
  projectedMarginPct,
  label = 'Projected Margin',
  summary,
  detail,
  miniStats = [],
}: ProjectHealthHeroProps) {
  const s = STATUS_STYLE[status];
  const Icon = status === 'green' ? TrendingUp : status === 'red' ? TrendingDown : Minus;
  const pctRounded = Math.round(projectedMarginPct);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 md:gap-6 items-center"
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${s.border}`,
        padding: '16px 18px',
        ...fontLabel,
      }}
    >

      {/* Left: status + value */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: s.bg, color: s.color,
              fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
              border: `1px solid ${s.color}33`,
            }}
          >
            <Icon size={12} />
            {s.label}
          </span>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700 }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '2.4rem', color: C.ink, lineHeight: 1, ...fontVal }}>
            {fmtSigned(projectedMargin)}
          </span>
          <span style={{ fontSize: '1rem', color: s.color, ...fontMono }}>
            {pctRounded >= 0 ? '+' : ''}{pctRounded}%
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
          {summary}
        </p>
        {detail && <div style={{ marginTop: 6 }}>{detail}</div>}
      </div>

      {/* Right: mini stats */}
      {miniStats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(miniStats.length, 3)}, minmax(0, 1fr))`,
            gap: 14,
            minWidth: 280,
          }}
          className="max-md:min-w-full max-md:w-full"
        >
          {miniStats.map((m) => {
            const toneColor = m.tone === 'pos' ? C.green : m.tone === 'neg' ? C.red : C.ink;
            return (
              <div key={m.label} style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, fontWeight: 700, marginBottom: 4 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '1.1rem', color: toneColor, ...fontMono }}>{m.value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function computeHealthStatus(
  projectedMarginPct: number,
  cashPosition: number,
  pendingNetAtRisk: number,
  approvedNet: number,
  hasContract: boolean,
): HealthStatus {
  if (!hasContract) return 'neutral';
  // Red: thin margin or pending CO losses exceed approved gains
  if (projectedMarginPct < 5) return 'red';
  if (pendingNetAtRisk < 0 && Math.abs(pendingNetAtRisk) > Math.max(approvedNet, 0)) return 'red';
  // Amber: middling margin, or cash underwater
  if (projectedMarginPct < 20) return 'amber';
  if (cashPosition < 0) return 'amber';
  return 'green';
}

export function buildHealthSummary(opts: {
  projectedMarginPct: number;
  cashPosition: number;
  pendingNetAtRisk: number;
  approvedNet: number;
  hasContract: boolean;
  roleLabel: string;
}): string {
  const { projectedMarginPct, cashPosition, pendingNetAtRisk, hasContract, roleLabel } = opts;
  if (!hasContract) {
    const article = /^[aeiou]/i.test(roleLabel) ? 'an' : 'a';
    return `Set ${article} ${roleLabel} contract to see your projected margin and health.`;
  }
  const pct = Math.round(projectedMarginPct);
  const parts: string[] = [];
  if (projectedMarginPct >= 20) parts.push(`Healthy ${pct}% projected margin.`);
  else if (projectedMarginPct >= 5) parts.push(`Margin tight at ${pct}% — watch costs.`);
  else parts.push(`Margin critical at ${pct}% — review pricing or costs.`);
  if (cashPosition < 0) parts.push(`Cash position ${fmt(cashPosition)} — you've paid out more than collected.`);
  if (pendingNetAtRisk < -1000) parts.push(`${fmt(Math.abs(pendingNetAtRisk))} at risk in pending COs.`);
  return parts.join(' ');
}
