import { ChevronRight } from 'lucide-react';
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
 * Compact attention bar for the TOP of the project overview.
 * Horizontal chip layout on desktop; stacks on mobile.
 * Renders nothing when there are no warnings.
 */
export function OverviewAttentionStrip({ warnings, projectName, onNavigate }: Props) {
  if (warnings.length === 0) return null;

  const hasRed = warnings.some(w => w.pillType === 'pr');

  return (
    <div
      style={{
        background: hasRed ? '#FEF2F2' : '#FFFBEB',
        borderRadius: 12,
        border: `1px solid ${hasRed ? '#FECACA' : '#FDE68A'}`,
        ...fontLabel,
      }}
      className="px-3 py-2 sm:px-3.5 sm:py-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{ fontSize: 14 }}>🚨</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: C.ink,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              whiteSpace: 'nowrap',
            }}
          >
            Needs Attention
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              color: C.muted,
              marginLeft: 4,
              whiteSpace: 'nowrap',
            }}
            className="hidden sm:inline"
          >
            · {projectName}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:flex-wrap flex-1 sm:justify-end">
          {warnings.map((w, i) => (
            <button
              key={i}
              onClick={() => onNavigate(w.tab)}
              className="inline-flex items-center gap-1.5 transition-all hover:-translate-y-px hover:shadow-sm w-full sm:w-auto justify-between sm:justify-start"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${w.color}`,
                borderRadius: 8,
                padding: '6px 10px 6px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: C.ink2,
                cursor: 'pointer',
              }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span style={{ fontSize: 13 }}>{w.icon}</span>
                <span className="truncate">{w.title}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <Pill type={w.pillType}>{w.pill}</Pill>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
