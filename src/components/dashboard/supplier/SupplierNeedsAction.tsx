import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { C, fontVal, fontLabel, fmt } from '@/components/shared/KpiCard';

export interface NeedsActionRow {
  projectId: string;
  name: string;
  status: string;
  estimate: number;
  ordered: number;
  billed: number;
  received: number;
  overBy: number;
  packOverBy: number;
  packsOverCount: number;
  daysSinceLastPayment: number | null;
  risk: 'On Track' | 'Watch' | 'Over Budget';
}

interface DeliveryLike {
  poNumber: string;
  projectId: string;
  projectName: string;
  deliveryDate: string;
  status: string;
}

type Severity = 'critical' | 'warning' | 'info';

interface ActionItem {
  id: string;
  severity: Severity;
  kind: string;
  title: string;
  detail: string;
  amount: number | null;
  projectId: string;
  cta: string;
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const SEV_DOT: Record<Severity, string> = { critical: C.red, warning: C.amber, info: C.blue };
const SEV_BG: Record<Severity, string> = { critical: C.redBg, warning: C.amberPale, info: C.blueBg };
const SEV_TEXT: Record<Severity, string> = { critical: C.red, warning: C.amberD, info: C.blue };

export function SupplierNeedsAction({
  rows,
  deliveries,
}: {
  rows: NeedsActionRow[];
  deliveries: DeliveryLike[];
}) {
  const navigate = useNavigate();

  const items = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = [];
    const active = rows.filter(r => !['archived', 'completed'].includes(r.status));

    for (const r of active) {
      // 1. Missing estimate
      if (r.estimate <= 0) {
        out.push({
          id: `est-${r.projectId}`,
          severity: 'warning',
          kind: 'Estimate missing',
          title: r.name,
          detail: r.ordered > 0 ? `${fmt(r.ordered)} already ordered with no estimate on file` : 'No estimate submitted yet',
          amount: null,
          projectId: r.projectId,
          cta: 'Add estimate',
        });
      }

      // 2. Over budget
      const overAmt = r.overBy > 0 ? r.overBy : r.packOverBy;
      if (overAmt > 0) {
        out.push({
          id: `over-${r.projectId}`,
          severity: r.risk === 'Over Budget' ? 'critical' : 'warning',
          kind: 'Over estimate',
          title: r.name,
          detail: r.packsOverCount > 0
            ? `${r.packsOverCount} pack${r.packsOverCount > 1 ? 's' : ''} above estimate`
            : 'Ordered value exceeds estimate',
          amount: overAmt,
          projectId: r.projectId,
          cta: 'Review',
        });
      }

      // 3. Delivered / ordered but not invoiced
      const notBilled = r.ordered - r.billed;
      if (notBilled > 0) {
        out.push({
          id: `bill-${r.projectId}`,
          severity: 'warning',
          kind: 'Ready to invoice',
          title: r.name,
          detail: 'Ordered value not yet billed',
          amount: notBilled,
          projectId: r.projectId,
          cta: 'Create invoice',
        });
      }

      // 4. Outstanding receivables
      const outstanding = r.billed - r.received;
      if (outstanding > 0) {
        const stale = r.daysSinceLastPayment !== null && r.daysSinceLastPayment > 30;
        out.push({
          id: `ar-${r.projectId}`,
          severity: stale ? 'critical' : 'info',
          kind: 'Awaiting payment',
          title: r.name,
          detail: r.daysSinceLastPayment !== null
            ? `Last payment ${r.daysSinceLastPayment} day${r.daysSinceLastPayment === 1 ? '' : 's'} ago`
            : 'No payment received yet',
          amount: outstanding,
          projectId: r.projectId,
          cta: 'Follow up',
        });
      }
    }

    // 5. Deliveries in the next 7 days
    const now = Date.now();
    for (const d of deliveries) {
      const ts = new Date(d.deliveryDate).getTime();
      if (Number.isNaN(ts)) continue;
      const days = Math.floor((ts - now) / 86400000);
      if (days > 7) continue;
      out.push({
        id: `del-${d.poNumber}-${d.projectId}`,
        severity: days < 0 ? 'critical' : 'info',
        kind: days < 0 ? 'Delivery overdue' : 'Delivery due',
        title: `${d.poNumber} · ${d.projectName}`,
        detail: days < 0
          ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} past scheduled date`
          : days === 0 ? 'Scheduled today' : `In ${days} day${days === 1 ? '' : 's'}`,
        amount: null,
        projectId: d.projectId,
        cta: 'Open PO',
      });
    }

    return out.sort((a, b) => {
      const s = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (s !== 0) return s;
      return (b.amount ?? 0) - (a.amount ?? 0);
    });
  }, [rows, deliveries]);

  const criticalCount = items.filter(i => i.severity === 'critical').length;
  const shown = items.slice(0, 6);

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${criticalCount > 0 ? `${C.red}44` : C.border}`,
        overflow: 'hidden',
        ...fontLabel,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink }}>Needs your action</div>
          <div style={{ fontSize: '0.7rem', color: C.faint, marginTop: 2 }}>
            {items.length === 0 ? 'Nothing waiting on you' : 'Highest-impact items first'}
          </div>
        </div>
        {items.length > 0 && (
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 9,
              background: criticalCount > 0 ? C.redBg : C.amberPale,
              color: criticalCount > 0 ? C.red : C.amberD,
              whiteSpace: 'nowrap',
            }}
          >
            {items.length} item{items.length === 1 ? '' : 's'}
            {criticalCount > 0 ? ` · ${criticalCount} urgent` : ''}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '26px 16px', textAlign: 'center', color: C.muted, fontSize: '0.8rem' }}>
          All clear — estimates, invoices, payments and deliveries are up to date.
        </div>
      ) : (
        <div>
          {shown.map(i => (
            <button
              key={i.id}
              onClick={() => navigate(`/project/${i.projectId}`)}
              className="w-full hover:bg-muted/40 transition-colors"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                padding: '11px 16px',
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
                ...fontLabel,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: SEV_DOT[i.severity],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.56rem',
                    fontWeight: 800,
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 7,
                    background: SEV_BG[i.severity],
                    color: SEV_TEXT[i.severity],
                  }}
                >
                  {i.kind}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: C.ink,
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {i.title}
                </span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: C.muted, marginTop: 1 }}>
                  {i.detail}
                </span>
              </span>
              {i.amount !== null && (
                <span style={{ ...fontVal, fontSize: '0.86rem', fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>
                  {fmt(i.amount)}
                </span>
              )}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: C.amber,
                  whiteSpace: 'nowrap',
                }}
              >
                {i.cta}
                <ChevronRight size={12} />
              </span>
            </button>
          ))}
          {items.length > shown.length && (
            <div style={{ padding: '10px 16px', fontSize: '0.68rem', color: C.muted }}>
              + {items.length - shown.length} more item{items.length - shown.length === 1 ? '' : 's'} below in the tables
            </div>
          )}
        </div>
      )}
    </div>
  );
}
