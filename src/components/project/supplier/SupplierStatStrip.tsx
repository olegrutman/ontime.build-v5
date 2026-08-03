import { C, fontMono, fontLabel, fmt } from '@/components/shared/KpiCard';

export interface StatTile {
  label: string;
  /** Numeric value, or a pre-formatted string (e.g. a count). */
  value: number | string;
  /** When true the value is rendered as-is instead of currency-formatted. */
  raw?: boolean;
  hint?: string;
  tab?: string;
}

interface Props {
  tiles: StatTile[];
  onNavigate: (tab: string) => void;
}

/**
 * Compact strip for KPI stages that have no data yet — keeps them visible
 * and clickable without spending a full expandable card on a `$0`.
 */
export function SupplierStatStrip({ tiles, onNavigate }: Props) {
  if (tiles.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {tiles.map((t, i) => {
        const clickable = !!t.tab;
        return (
          <button
            key={t.label}
            type="button"
            disabled={!clickable}
            onClick={() => t.tab && onNavigate(t.tab)}
            className={`text-left px-3.5 py-3 transition-colors ${clickable ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'}`}
            style={{
              background: 'transparent',
              border: 'none',
              borderRight: `1px solid ${C.border}`,
              borderTop: i >= 2 ? `1px solid ${C.border}` : undefined,
              ...fontLabel,
            }}
          >
            <div
              className="uppercase truncate"
              style={{ ...fontLabel, fontSize: '0.56rem', letterSpacing: '0.07em', color: C.faint, fontWeight: 700 }}
            >
              {t.label}
            </div>
            <div style={{ ...fontMono, fontSize: '0.92rem', color: C.ink2, marginTop: 2 }}>
              {t.raw ? String(t.value) : fmt(typeof t.value === 'number' ? t.value : 0)}
            </div>
            {t.hint && (
              <div className="truncate" style={{ ...fontLabel, fontSize: '0.62rem', color: C.muted, marginTop: 1 }}>
                {t.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
