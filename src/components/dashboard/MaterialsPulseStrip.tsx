import { useNavigate } from 'react-router-dom';
import { Truck, DollarSign, Wallet, PackageCheck, ChevronRight } from 'lucide-react';
import { C, fontLabel, fontMono, fontVal, fmt, Pill, type PillType } from '@/components/shared/KpiCard';
import type { MaterialsPulse } from '@/hooks/useMaterialsPulse';

interface Tile {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  pill: { type: PillType; text: string };
  accent: string;
  iconBg: string;
  onClick: () => void;
}

interface Props {
  pulse: MaterialsPulse | undefined;
  loading: boolean;
}

export function MaterialsPulseStrip({ pulse, loading }: Props) {
  const navigate = useNavigate();

  if (loading || !pulse) {
    return (
      <div
        className="rounded-2xl"
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          padding: '14px 16px', color: C.muted, fontSize: '0.78rem', ...fontLabel,
        }}
      >
        Loading materials pulse…
      </div>
    );
  }

  const goPO = () => navigate('/purchase-orders');

  // ── Late
  const lateOk = pulse.lateCount === 0;
  // ── Re-priced
  const repricedOk = pulse.repricedDelta <= 0 && pulse.repricedLineCount === 0;
  const repricedWatch = !repricedOk && pulse.repricedDelta <= 0;
  // ── Cash due
  const dueWatch = pulse.agingD31_60 > 0;
  const dueRed = pulse.agingD60Plus > 0;
  // ── In transit (positive — green by default)

  const tiles: Tile[] = [
    {
      icon: <Truck size={16} color={lateOk ? C.green : C.red} />,
      label: 'LATE DELIVERIES',
      value: lateOk ? '0' : `${pulse.lateCount}`,
      sub: lateOk ? 'All POs on schedule' : `${fmt(pulse.lateValue)} at risk`,
      pill: lateOk ? { type: 'pg', text: 'On Time' } : { type: 'pr', text: 'Late' },
      accent: lateOk ? C.green : C.red,
      iconBg: lateOk ? C.greenBg : C.redBg,
      onClick: goPO,
    },
    {
      icon: <DollarSign size={16} color={repricedOk ? C.green : repricedWatch ? C.blue : C.amberD} />,
      label: 'SUPPLIER RE-PRICES',
      value: pulse.repricedLineCount === 0
        ? '—'
        : `${pulse.repricedDelta >= 0 ? '+' : '-'}${fmt(Math.abs(pulse.repricedDelta))}`,
      sub: pulse.repricedLineCount === 0
        ? `0 of ${pulse.repricedTotalLines} lines adjusted`
        : `${pulse.repricedLineCount} of ${pulse.repricedTotalLines} lines re-priced`,
      pill: repricedOk
        ? { type: 'pg', text: 'No drift' }
        : repricedWatch
        ? { type: 'pb', text: 'Under' }
        : { type: 'pa', text: 'Over' },
      accent: repricedOk ? C.green : repricedWatch ? C.blue : C.amber,
      iconBg: repricedOk ? C.greenBg : repricedWatch ? C.blueBg : C.amberPale,
      onClick: goPO,
    },
    {
      icon: <Wallet size={16} color={dueRed ? C.red : dueWatch ? C.amberD : C.green} />,
      label: 'CASH DUE ≤14 DAYS',
      value: pulse.dueNext14Days > 0 ? fmt(pulse.dueNext14Days) : '—',
      sub: dueRed
        ? `${fmt(pulse.agingD60Plus)} aged 60d+`
        : dueWatch
        ? `${fmt(pulse.agingD31_60)} aged 31-60d`
        : 'No payables aging',
      pill: dueRed
        ? { type: 'pr', text: '60d+' }
        : dueWatch
        ? { type: 'pa', text: '30-60d' }
        : { type: 'pg', text: 'Current' },
      accent: dueRed ? C.red : dueWatch ? C.amber : C.green,
      iconBg: dueRed ? C.redBg : dueWatch ? C.amberPale : C.greenBg,
      onClick: goPO,
    },
    {
      icon: <PackageCheck size={16} color={C.blue} />,
      label: 'IN TRANSIT',
      value: `${pulse.inTransitCount}`,
      sub: pulse.inTransitCount > 0
        ? `${fmt(pulse.inTransitValue)} · ${pulse.etaToday} arriving today`
        : 'No active deliveries',
      pill: pulse.etaToday > 0
        ? { type: 'pg', text: `ETA ${pulse.etaToday} today` }
        : pulse.inTransitCount > 0
        ? { type: 'pb', text: 'Moving' }
        : { type: 'pm', text: 'Idle' },
      accent: C.blue,
      iconBg: C.blueBg,
      onClick: goPO,
    },
  ];

  // Don't render at all if there's truly no signal (no POs anywhere)
  const totallyEmpty =
    pulse.lateCount === 0 &&
    pulse.repricedTotalLines === 0 &&
    pulse.dueNext14Days === 0 &&
    pulse.inTransitCount === 0;
  if (totallyEmpty) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...fontLabel }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.surface2 }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 4, height: 16, background: C.purple, borderRadius: 2 }} />
          <span
            style={{
              fontSize: '0.72rem', fontWeight: 800, color: C.ink,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            📦 Materials Pulse
          </span>
        </div>
        <span style={{ fontSize: '0.62rem', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Across all active projects
        </span>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <button
            key={t.label}
            onClick={t.onClick}
            className="text-left transition-colors hover:bg-[rgba(245,166,35,.04)] active:bg-[rgba(245,166,35,.08)]"
            style={{
              padding: '12px 14px',
              borderRight: i < tiles.length - 1 ? `1px solid ${C.border}` : 'none',
              borderTop: 'none',
              borderBottom: `3px solid ${t.accent}`,
              background: 'transparent',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="flex items-center justify-center rounded-md"
                style={{ width: 26, height: 26, background: t.iconBg }}
              >
                {t.icon}
              </div>
              <Pill type={t.pill.type}>{t.pill.text}</Pill>
            </div>
            <div
              style={{
                ...fontVal, fontSize: '1.5rem', color: C.ink, lineHeight: 1.05,
                marginBottom: 2,
              }}
            >
              {t.value}
            </div>
            <div
              style={{
                fontSize: '0.58rem', fontWeight: 800, color: C.faint,
                textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
              }}
            >
              {t.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: C.muted, lineHeight: 1.35 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* Hot projects */}
      {pulse.hotProjects.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div
            style={{
              padding: '8px 14px', fontSize: '0.6rem', color: C.faint,
              textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800,
              background: C.surface2,
            }}
          >
            Hot projects
          </div>
          {pulse.hotProjects.map((hp, i) => (
            <button
              key={hp.projectId}
              onClick={() => navigate(`/project/${hp.projectId}/purchase-orders`)}
              className="w-full flex items-center justify-between text-left transition-colors hover:bg-[rgba(245,166,35,.05)]"
              style={{
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: hp.severity === 'red' ? C.red : C.amber,
                    flexShrink: 0,
                  }}
                />
                <span
                  className="truncate"
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink }}
                >
                  {hp.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  style={{
                    ...fontMono, fontSize: '0.7rem', color: C.muted, fontWeight: 600,
                  }}
                  className="hidden sm:inline"
                >
                  {hp.reason}
                </span>
                <ChevronRight size={14} color={C.faint} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
