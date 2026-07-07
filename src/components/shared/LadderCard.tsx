import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, BarRow } from './KpiCard';

/**
 * LadderCard — collapses a 4–5 row stacked bar "ladder" into a
 * scannable 2-KPI card. Headline shows the two most decision-relevant
 * percentages with a segmented mini-bar. Click to expand the full ladder.
 *
 * Used in FC and Supplier overviews to replace inline BarRow blocks.
 */
export interface LadderRow {
  label: string;
  value: string;
  pct: number;
  barColor: string;
  /** true = show in headline KPIs (max 2) */
  headline?: boolean;
}

interface Props {
  title: string;
  totalLabel: string;
  totalValue: string;
  rows: LadderRow[];
  /** Segments composing the compact stacked bar (in order). */
  segments?: { pct: number; color: string }[];
  defaultExpanded?: boolean;
}

export function LadderCard({ title, totalLabel, totalValue, rows, segments, defaultExpanded = false }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const headline = rows.filter((r) => r.headline).slice(0, 2);
  const segs = segments ?? headline.map((r) => ({ pct: r.pct, color: r.barColor }));

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        ...fontLabel,
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>{title}</span>
          <span style={{ fontSize: '0.66rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {totalLabel} · <span style={{ ...fontMono, color: C.ink2 }}>{totalValue}</span>
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: C.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Headline KPIs + mini stacked bar */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(headline.length, 1)}, 1fr)`, gap: 12, marginBottom: 10 }}>
          {headline.map((r, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.6rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                {r.label}
              </span>
              <span style={{ ...fontVal, fontSize: '1.4rem', color: C.ink, lineHeight: 1 }}>
                {Math.round(r.pct)}%
              </span>
              <span style={{ ...fontMono, fontSize: '0.7rem', color: C.ink2 }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Compact stacked bar */}
        <div style={{ display: 'flex', width: '100%', height: 6, borderRadius: 4, overflow: 'hidden', background: C.border }}>
          {segs.map((s, i) => (
            <div
              key={i}
              style={{
                width: `${Math.min(Math.max(s.pct, 0), 100)}%`,
                height: '100%',
                background: s.color,
                transition: 'width 0.6s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Expanded full ladder */}
      {open && (
        <div style={{ padding: '4px 18px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ paddingTop: 14 }}>
            {rows.map((r, i) => (
              <BarRow key={i} label={r.label} value={r.value} pct={r.pct} barColor={r.barColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
