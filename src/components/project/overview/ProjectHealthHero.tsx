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
  /** Optional mini stats (label + value pairs). */
  miniStats?: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }[];
  /** When true the upstream contract is unset, so margin numbers are meaningless. */
  awaitingUpstream?: boolean;
}

const STATUS_STYLE: Record<HealthStatus, { color: string; label: string }> = {
  green: { color: '#34D399', label: 'Healthy' },
  amber: { color: '#FBBF24', label: 'Watch' },
  red: { color: '#F87171', label: 'At Risk' },
  neutral: { color: '#94A3B8', label: 'Awaiting Data' },
};

/**
 * Money headline for the project overview — the single dark surface on the page.
 * Owns the projected margin, cash position, and CO figures so the cards below
 * never repeat them.
 */
export function ProjectHealthHero({
  status,
  projectedMargin,
  projectedMarginPct,
  label = 'Projected Margin',
  summary,
  detail,
  miniStats = [],
  awaitingUpstream = false,
}: ProjectHealthHeroProps) {
  const s = STATUS_STYLE[status];
  const Icon = status === 'green' ? TrendingUp : status === 'red' ? TrendingDown : Minus;
  const pctRounded = Math.round(projectedMarginPct);

  return (
    <div
      className="rounded-2xl px-5 py-5 text-white"
      style={{ background: '#0F172A', ...fontLabel }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            style={{
              fontSize: '0.62rem',
              textTransform: 'uppercase',
              letterSpacing: '1.6px',
              fontWeight: 800,
              color: '#64748B',
            }}
          >
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
            {awaitingUpstream ? (
              <span style={{ fontSize: '2.5rem', lineHeight: 1, color: '#64748B', ...fontVal }}>—</span>
            ) : (
              <>
                <span style={{ fontSize: '2.5rem', lineHeight: 1, color: '#FFFFFF', ...fontVal }}>
                  {fmtSigned(projectedMargin)}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, ...fontMono }}>
                  {pctRounded >= 0 ? '+' : ''}{pctRounded}%
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 shrink-0"
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            background: `${s.color}1A`,
            border: `1px solid ${s.color}33`,
            color: s.color,
            fontSize: '0.6rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
          }}
        >
          <Icon size={12} />
          {s.label}
        </span>
      </div>

      <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: 14, lineHeight: 1.5 }}>
        {summary}
      </p>
      {detail && <div style={{ marginTop: 6 }}>{detail}</div>}

      {miniStats.length > 0 && (
        <div
          className="grid grid-cols-3 gap-3 mt-4 pt-4 max-[380px]:grid-cols-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {miniStats.map((m) => {
            const toneColor = m.tone === 'pos' ? '#34D399' : m.tone === 'neg' ? '#F87171' : '#FFFFFF';
            return (
              <div key={m.label} className="min-w-0">
                <div
                  style={{
                    fontSize: '0.58rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1.1px',
                    color: '#64748B',
                    fontWeight: 800,
                    marginBottom: 5,
                    lineHeight: 1.2,
                  }}
                >
                  {m.label}
                </div>
                <div style={{ fontSize: '0.95rem', color: toneColor, fontWeight: 700, ...fontMono }}>
                  {m.value}
                </div>
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
