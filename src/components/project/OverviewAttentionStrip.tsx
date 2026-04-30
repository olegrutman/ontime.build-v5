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
        padding: '10px 14px',
        ...fontLabel,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-1.5 flex-wrap flex-1 sm:justify-end">
          {warnings.map((w, i) => (
            <button
              key={i}
              onClick={() => onNavigate(w.tab)}
              className="inline-flex items-center gap-1.5 transition-all hover:-translate-y-px hover:shadow-sm"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${w.color}`,
                borderRadius: 8,
                padding: '5px 9px 5px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: C.ink2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 13 }}>{w.icon}</span>
              <span>{w.title}</span>
              <Pill type={w.pillType}>{w.pill}</Pill>
              <ChevronRight className="w-3 h-3 opacity-50" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
