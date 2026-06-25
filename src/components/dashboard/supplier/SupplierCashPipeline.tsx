import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, fmt } from '@/components/shared/KpiCard';

interface Stage {
  key: 'estimated' | 'ordered' | 'billed' | 'received' | 'outstanding';
  label: string;
  value: number;
  sub: string;
  tone: 'neutral' | 'warning' | 'primary' | 'good' | 'danger';
  flag?: string;
}

interface Props {
  totalEstimate: number;
  totalOrdered: number;
  totalBilled: number;
  totalReceived: number;
  totalOutstanding: number;
  totalOver: number;
  orderedPct: number;
  billedPct: number;
  receivedPct: number;
  activeProjects: number;
}

function useCountUp(target: number, durMs = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durMs]);
  return v;
}

const TONE_BG: Record<Stage['tone'], string> = {
  neutral: C.surface2,
  warning: C.amberPale,
  primary: C.navy,
  good: C.greenBg,
  danger: C.redBg,
};
const TONE_LABEL: Record<Stage['tone'], string> = {
  neutral: C.muted,
  warning: C.amberD,
  primary: '#FFFFFFB3',
  good: C.green,
  danger: C.red,
};
const TONE_VALUE: Record<Stage['tone'], string> = {
  neutral: C.ink,
  warning: C.ink,
  primary: '#FFFFFF',
  good: C.greenDark,
  danger: C.red,
};
const TONE_SUB: Record<Stage['tone'], string> = {
  neutral: C.muted,
  warning: C.amberD,
  primary: '#FFFFFFCC',
  good: C.green,
  danger: C.red,
};

function StageCell({ s, index, total }: { s: Stage; index: number; total: number }) {
  const val = useCountUp(s.value);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <div
      className="group relative transition-transform hover:-translate-y-0.5"
      style={{
        background: TONE_BG[s.tone],
        padding: '16px 18px',
        borderTopLeftRadius: isFirst ? 14 : 0,
        borderBottomLeftRadius: isFirst ? 14 : 0,
        borderTopRightRadius: isLast ? 14 : 0,
        borderBottomRightRadius: isLast ? 14 : 0,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: TONE_LABEL[s.tone],
            ...fontLabel,
          }}
        >
          {s.label}
        </span>
        {s.flag && (
          <span
            style={{
              fontSize: '0.58rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 8,
              background: '#FFFFFF',
              color: C.red,
              border: `1px solid ${C.red}33`,
              ...fontLabel,
              whiteSpace: 'nowrap',
            }}
          >
            {s.flag}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '1.55rem',
          lineHeight: 1.05,
          marginTop: 6,
          color: TONE_VALUE[s.tone],
          ...fontVal,
          letterSpacing: '-0.5px',
        }}
      >
        {fmt(val)}
      </div>
      <div
        style={{
          fontSize: '0.66rem',
          marginTop: 4,
          color: TONE_SUB[s.tone],
          fontWeight: 500,
          ...fontLabel,
        }}
      >
        {s.sub}
      </div>

      {!isLast && (
        <div
          className="hidden lg:flex"
          style={{
            position: 'absolute',
            top: '50%',
            right: -10,
            transform: 'translateY(-50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: C.surface,
            border: `1px solid ${C.border}`,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            color: C.faint,
          }}
        >
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
}

export function SupplierCashPipeline({
  totalEstimate,
  totalOrdered,
  totalBilled,
  totalReceived,
  totalOutstanding,
  totalOver,
  orderedPct,
  billedPct,
  receivedPct,
  activeProjects,
}: Props) {
  const stages: Stage[] = [
    {
      key: 'estimated',
      label: 'Estimated',
      value: totalEstimate,
      sub: `${activeProjects} active project${activeProjects === 1 ? '' : 's'}`,
      tone: 'neutral',
    },
    {
      key: 'ordered',
      label: 'Ordered',
      value: totalOrdered,
      sub: `${orderedPct}% of estimate`,
      tone: totalOver > 0 ? 'warning' : 'neutral',
      flag: totalOver > 0 ? `+${fmt(totalOver)} over` : undefined,
    },
    {
      key: 'billed',
      label: 'Billed',
      value: totalBilled,
      sub: `${billedPct}% of ordered`,
      tone: 'primary',
    },
    {
      key: 'received',
      label: 'Received',
      value: totalReceived,
      sub: `${receivedPct}% of billed`,
      tone: totalReceived > 0 ? 'good' : 'neutral',
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      value: totalOutstanding,
      sub: totalOutstanding > 0 ? 'awaiting payment' : 'fully collected',
      tone: totalOutstanding > 0 ? 'danger' : 'good',
    },
  ];

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '18px 18px 20px',
        boxShadow: '0 1px 2px rgba(15,25,35,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: C.muted,
              ...fontLabel,
            }}
          >
            Cash Pipeline
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: C.faint,
              marginTop: 2,
              ...fontLabel,
            }}
          >
            Where every dollar sits, end-to-end
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: C.faint,
              ...fontLabel,
            }}
          >
            Total Pipeline
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              color: C.ink,
              ...fontMono,
              marginTop: 2,
            }}
          >
            {fmt(totalEstimate)}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
        style={{ gap: 2 }}
      >
        {stages.map((s, i) => (
          <StageCell key={s.key} s={s} index={i} total={stages.length} />
        ))}
      </div>
    </div>
  );
}
