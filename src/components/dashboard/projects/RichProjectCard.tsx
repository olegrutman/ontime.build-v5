import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, fmt } from '@/components/shared/KpiCard';
import { computeHealthStatus, type HealthStatus } from '@/components/project/overview/ProjectHealthHero';
import type { NextAction } from './projectNextAction';

interface RichProjectCardProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  revenue: number;
  costs: number;
  paidToYou: number;
  paidByYou?: number;
  pendingToCollect: number;
  /** Role-aware label for the "Contract" column. */
  contractLabel?: string;
  /** Role-aware label for the "Cost" column. */
  costLabel?: string;
  nextAction: NextAction;
  /** If true, the cost column is hidden (e.g. FC viewer who shouldn't see upstream pricing). */
  hideCost?: boolean;
}

const STATUS_PILL: Record<HealthStatus, { bg: string; color: string; label: string }> = {
  green: { bg: C.greenBg, color: C.green, label: 'On Track' },
  amber: { bg: C.yellowBg, color: C.yellow, label: 'Watch' },
  red: { bg: C.redBg, color: C.red, label: 'At Risk' },
  neutral: { bg: C.surface2, color: C.muted, label: 'Setup' },
};

const PROJECT_STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: C.greenBg, color: C.green, label: 'Active' },
  setup: { bg: C.surface2, color: C.muted, label: 'Setup' },
  on_hold: { bg: C.yellowBg, color: C.yellow, label: 'On Hold' },
  completed: { bg: C.blueBg, color: C.blue, label: 'Done' },
  archived: { bg: C.surface2, color: C.faint, label: 'Archived' },
};

export function RichProjectCard({
  projectId,
  projectName,
  projectStatus,
  revenue,
  costs,
  paidToYou,
  paidByYou = 0,
  pendingToCollect,
  contractLabel = 'Contract',
  costLabel = 'Cost',
  nextAction,
  hideCost = false,
}: RichProjectCardProps) {
  const navigate = useNavigate();

  const margin = revenue - costs;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  const hasContract = revenue > 0;
  // Reuse the project-overview health logic; portfolio CO data isn't per-project here, so pass 0/0.
  const cashPosition = paidToYou - paidByYou; // net working capital on this project
  const health: HealthStatus = computeHealthStatus(marginPct, cashPosition, 0, 0, hasContract);

  const completionPct = revenue > 0 ? Math.min(Math.round(((paidToYou + pendingToCollect) / revenue) * 100), 100) : 0;

  const statusPill = PROJECT_STATUS_PILL[projectStatus] || PROJECT_STATUS_PILL.setup;
  const healthPill = STATUS_PILL[health];
  const HealthIcon = health === 'green' ? TrendingUp : health === 'red' ? TrendingDown : Minus;

  const actionTone =
    nextAction.tone === 'urgent' ? { bg: C.redBg, color: C.red, border: C.red } :
    nextAction.tone === 'normal' ? { bg: C.blueBg, color: C.blue, border: C.blue } :
    { bg: C.surface2, color: C.muted, border: C.border };

  return (
    <div
      onClick={() => navigate(`/project/${projectId}`)}
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${healthPill.color}`,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        ...fontLabel,
      }}
      className="hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Header row: name + status + health */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.95rem', color: C.ink, fontWeight: 700, ...fontLabel, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 7px', borderRadius: 8,
              background: statusPill.bg, color: statusPill.color,
              fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {statusPill.label}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 7px', borderRadius: 8,
              background: healthPill.bg, color: healthPill.color,
              fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              border: `1px solid ${healthPill.color}33`,
            }}>
              <HealthIcon size={9} />
              {healthPill.label}
            </span>
          </div>
        </div>
        <ChevronRight size={16} color={C.faint} style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Progress bar */}
      {hasContract && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.62rem', color: C.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Billed Progress
            </span>
            <span style={{ fontSize: '0.7rem', color: C.muted, ...fontMono, fontWeight: 700 }}>
              {completionPct}%
            </span>
          </div>
          <div style={{ width: '100%', height: 6, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
            <div style={{
              width: `${completionPct}%`, height: '100%', borderRadius: 4,
              background: healthPill.color, transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Financials row */}
      <div
        className={hideCost ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}
        style={{
          paddingTop: 6,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <Cell label={contractLabel} value={fmt(revenue)} />
        <Cell
          label="Margin"
          value={projectStatus === 'setup' ? '—' : fmt(margin)}
          tone={projectStatus === 'setup' ? 'muted' : (margin >= 0 ? 'pos' : 'neg')}
          suffix={projectStatus !== 'setup' && hasContract ? `${marginPct >= 0 ? '+' : ''}${Math.round(marginPct)}%` : undefined}
        />


        {!hideCost && (
          <div className="col-span-2 sm:col-span-1">
            <Cell label={costLabel} value={fmt(costs)} tone="muted" />
          </div>
        )}
      </div>


      {/* Next action footer */}
      <div
        onClick={(e) => { e.stopPropagation(); navigate(nextAction.href); }}
        style={{
          marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: 8,
          background: actionTone.bg, color: actionTone.color,
          border: `1px solid ${actionTone.border}33`,
          fontSize: '0.7rem', fontWeight: 700, ...fontLabel,
        }}
        className="hover:brightness-95"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nextAction.label}
        </span>
        <ChevronRight size={13} />
      </div>
    </div>
  );
}

function Cell({ label, value, tone = 'ink', suffix }: { label: string; value: string; tone?: 'ink' | 'muted' | 'pos' | 'neg'; suffix?: string }) {
  const color = tone === 'pos' ? C.green : tone === 'neg' ? C.red : tone === 'muted' ? C.muted : C.ink;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.58rem', color: C.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color, ...fontMono, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
      {suffix && (
        <div style={{ fontSize: '0.64rem', color, ...fontMono, marginTop: 1 }}>
          {suffix}
        </div>
      )}
    </div>
  );
}
