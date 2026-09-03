import { C, fontMono } from '@/components/shared/KpiCard';

export interface StackedValue {
  k: string;
  v: string;
  color?: string;
}

/**
 * Option 1 row — name on its own line, labelled mono values underneath.
 * Replaces multi-column tables inside narrow KPI cards so nothing scrolls sideways.
 */
export function StackedRow({ name, values }: { name: string; values: StackedValue[] }) {
  return (
    <div style={{ padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '0.76rem', fontWeight: 600, color: C.ink, lineHeight: 1.2, wordBreak: 'break-word' }}>{name}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 3 }}>
        {values.map(val => (
          <span key={val.k} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, fontWeight: 700, marginRight: 3 }}>{val.k}</span>
            <span style={{ color: val.color || C.ink2, ...fontMono }}>{val.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
