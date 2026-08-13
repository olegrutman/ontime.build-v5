import { AlertTriangle, ChevronRight } from 'lucide-react';
import { C, fontLabel, Pill, type PillType } from '@/components/shared/KpiCard';

export interface AttentionWarning {
  color: string;
  icon: string;
  title: string;
  sub: string;
  value: string;
  pill: string;
  pillType: PillType;
  tab: string;
}

interface Props {
  warnings: AttentionWarning[];
  projectName: string;
  onNavigate: (tab: string) => void;
}

/**
 * Single alerts zone for the project overview.
 * Says "Action required" exactly once, with a count — the only red surface on
 * the page, so nothing else has to compete with it.
 */
export function OverviewAttentionStrip({ warnings, onNavigate }: Props) {
  if (warnings.length === 0) return null;

  const hasRed = warnings.some((w) => w.pillType === 'pr');
  const accent = hasRed ? C.red : C.yellow;

  return (
    <div
      style={{
        background: hasRed ? '#FEF2F2' : '#FFFBEB',
        borderRadius: 16,
        border: `1px solid ${hasRed ? '#FECACA' : '#FDE68A'}`,
        ...fontLabel,
      }}
      className="p-3 sm:p-3.5"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <AlertTriangle size={14} style={{ color: accent, flexShrink: 0 }} />
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: accent,
            textTransform: 'uppercase',
            letterSpacing: '1.4px',
          }}
        >
          Action Required ({warnings.length})
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {warnings.map((w, i) => (
          <button
            key={i}
            onClick={() => onNavigate(w.tab)}
            className="flex items-center justify-between gap-2 text-left transition-all hover:-translate-y-px hover:shadow-sm"
            style={{
              background: '#FFFFFF',
              border: `1px solid ${hasRed ? '#FEE2E2' : '#FDE68A'}`,
              borderRadius: 12,
              padding: '10px 11px',
              cursor: 'pointer',
            }}
          >
            <span className="min-w-0">
              <span
                className="block truncate"
                style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink }}
              >
                {w.title}
              </span>
              <span
                className="block truncate"
                style={{ fontSize: '0.7rem', color: C.muted, marginTop: 2 }}
              >
                {w.sub || w.value}
              </span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Pill type={w.pillType}>{w.pill}</Pill>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: C.faint }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
