import { C, fmt, fontLabel, fontMono, fontVal } from '@/components/shared/KpiCard';

export interface LedgerRow {
  key: string;
  name: string;
  estimated: number;
  ordered: number;
  billed: number;
  received: number;
  status: string;
  statusColor?: string;
}

interface Props {
  title: string;
  rows: LedgerRow[];
  totals: { estimated: number; ordered: number; billed: number; received: number; outstanding: number };
  onNavigate?: (tab: string) => void;
}

const th: React.CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint,
  fontWeight: 700, textAlign: 'right', padding: '0 0 6px', borderBottom: `1px solid ${C.border}`,
};
const td: React.CSSProperties = {
  fontSize: '0.74rem', padding: '7px 0', borderBottom: `1px solid ${C.border}`, textAlign: 'right',
  ...fontMono, whiteSpace: 'nowrap',
};

function Mini({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 8, minWidth: 0 }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, fontWeight: 700 }}>{label}</div>
      <div style={{ color: C.ink, lineHeight: 1.1, ...fontVal }} className="text-lg sm:text-xl">{value}</div>
    </div>
  );
}

/**
 * Option 4 + 1 — five slim KPIs over one full-width ledger.
 * Desktop: a single wide table (Estimated / Ordered / Billed / Received / Status).
 * Mobile: the same data as stacked line items so nothing scrolls sideways.
 */
export function SupplierPackLedger({ title, rows, totals, onNavigate }: Props) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, ...fontLabel }} className="p-3 sm:p-4">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>{title}</div>
        {onNavigate && (
          <button onClick={() => onNavigate('purchase-orders')} style={{ fontSize: '0.7rem', fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer' }}>Purchase Orders →</button>
        )}
      </div>

      {/* Slim KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        <Mini label="Contract" value={fmt(totals.estimated)} accent={C.navy} />
        <Mini label="Ordered" value={fmt(totals.ordered)} accent={C.amber} />
        <Mini label="Billed" value={fmt(totals.billed)} accent={C.blue} />
        <Mini label="Received" value={fmt(totals.received)} accent={C.green} />
        <Mini label="Outstanding" value={fmt(totals.outstanding)} accent={totals.outstanding > 0 ? C.yellow : C.green} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 18, textAlign: 'center', color: C.muted, fontSize: '0.76rem' }}>No packs to show yet</div>
      ) : (
        <>
          {/* Desktop ledger */}
          <table className="hidden md:table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left', width: '32%' }}>Pack</th>
                <th style={th}>Estimated</th>
                <th style={th}>Ordered</th>
                <th style={th}>Billed</th>
                <th style={th}>Received</th>
                <th style={{ ...th, width: '15%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key}>
                  <td style={{ ...td, textAlign: 'left', ...fontLabel, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>{r.name}</td>
                  <td style={td}>{fmt(r.estimated)}</td>
                  <td style={{ ...td, color: r.ordered > r.estimated ? C.red : C.ink2 }}>{fmt(r.ordered)}</td>
                  <td style={td}>{fmt(r.billed)}</td>
                  <td style={td}>{fmt(r.received)}</td>
                  <td style={{ ...td, ...fontLabel, fontSize: '0.68rem', fontWeight: 700, color: r.statusColor || C.muted }}>{r.status}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, textAlign: 'left', ...fontLabel, fontWeight: 800, color: C.ink, borderBottom: 'none' }}>Total</td>
                <td style={{ ...td, fontWeight: 800, borderBottom: 'none' }}>{fmt(totals.estimated)}</td>
                <td style={{ ...td, fontWeight: 800, borderBottom: 'none' }}>{fmt(totals.ordered)}</td>
                <td style={{ ...td, fontWeight: 800, borderBottom: 'none' }}>{fmt(totals.billed)}</td>
                <td style={{ ...td, fontWeight: 800, borderBottom: 'none' }}>{fmt(totals.received)}</td>
                <td style={{ ...td, borderBottom: 'none' }} />
              </tr>
            </tbody>
          </table>

          {/* Mobile stacked line items */}
          <div className="md:hidden">
            {rows.map(r => (
              <div key={r.key} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: C.ink, lineHeight: 1.2, minWidth: 0 }}>{r.name}</div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: r.statusColor || C.muted, whiteSpace: 'nowrap' }}>{r.status}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4 }}>
                  {[
                    ['est', r.estimated, C.ink2],
                    ['ord', r.ordered, r.ordered > r.estimated ? C.red : C.ink2],
                    ['bill', r.billed, C.ink2],
                    ['recd', r.received, C.green],
                  ].map(([k, v, color]) => (
                    <span key={k as string} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginRight: 3, fontWeight: 700 }}>{k as string}</span>
                      <span style={{ color: color as string, ...fontMono }}>{fmt(v as number)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: '0.76rem', fontWeight: 800, color: C.ink }}>
              <span>Total</span>
              <span style={fontMono}>{fmt(totals.estimated)} est · {fmt(totals.ordered)} ord</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
