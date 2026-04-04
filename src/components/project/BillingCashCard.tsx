import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn, formatCurrency as fmt } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';

interface BillingCashCardProps {
  financials: ProjectFinancials;
}

const colorClass = (c?: 'green' | 'red' | 'amber') =>
  c === 'green' ? 'text-green-600 dark:text-green-400'
  : c === 'red' ? 'text-red-600 dark:text-red-400'
  : c === 'amber' ? 'text-amber-600 dark:text-amber-400'
  : 'text-foreground';

interface Row { label: string; value: string; color?: 'green' | 'red' | 'amber'; bold?: boolean }

function RowList({ rows, dividerBefore }: { rows: Row[]; dividerBefore?: number }) {
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className={cn("flex items-center justify-between", dividerBefore != null && i === dividerBefore && "border-t pt-2")}>
          <span className={cn("text-[0.85rem]", row.bold ? "font-medium text-foreground" : "text-muted-foreground")}>{row.label}</span>
          <span className={cn("tabular-nums", row.bold ? "text-base font-bold" : "text-[0.85rem] font-semibold", colorClass(row.color))} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BillingCashCard({ financials }: BillingCashCardProps) {
  const { loading, viewerRole } = financials;

  if (loading) return null;
  if (viewerRole === 'Supplier') return null;

  if (viewerRole === 'Trade Contractor') {
    const {
      receivablesInvoiced, receivablesCollected, receivablesRetainage,
      payablesInvoiced, payablesPaid, payablesRetainage,
    } = financials;

    const receivablesOutstanding = receivablesInvoiced - receivablesCollected - receivablesRetainage;
    const payablesOutstanding = payablesInvoiced - payablesPaid - payablesRetainage;
    const netCash = receivablesInvoiced - payablesInvoiced;

    return (
      <SurfaceCard data-sasha-card="Billing & Cash">
        <SurfaceCardHeader title="Billing & Cash Position" />
        <SurfaceCardBody className="pt-0 space-y-4">
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Receivables (from GC)</p>
            <RowList
              dividerBefore={3}
              rows={[
                { label: 'Invoiced to GC', value: fmt(receivablesInvoiced) },
                { label: 'Collected', value: fmt(receivablesCollected), color: receivablesCollected > 0 ? 'green' : undefined },
                { label: 'Retainage Held', value: fmt(receivablesRetainage), color: receivablesRetainage > 0 ? 'amber' : undefined },
                { label: 'Outstanding', value: fmt(receivablesOutstanding), color: receivablesOutstanding > 0 ? 'amber' : undefined, bold: true },
              ]}
            />
          </div>

          <div className="border-t pt-3">
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Payables (to FC & Suppliers)</p>
            <RowList
              dividerBefore={3}
              rows={[
                { label: 'Invoices Received', value: fmt(payablesInvoiced) },
                { label: 'Paid Out', value: fmt(payablesPaid), color: payablesPaid > 0 ? 'green' : undefined },
                { label: 'Retainage Held', value: fmt(payablesRetainage), color: payablesRetainage > 0 ? 'amber' : undefined },
                { label: 'Outstanding', value: fmt(payablesOutstanding), color: payablesOutstanding > 0 ? 'amber' : undefined, bold: true },
              ]}
            />
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <div>
              <span className="text-[0.85rem] font-medium text-foreground">Net Position</span>
              <p className="text-[0.65rem] text-muted-foreground">Total Invoiced to GC − Total Invoiced by FC</p>
            </div>
            <span className={cn("text-base font-bold tabular-nums", netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {fmt(netCash)}
            </span>
          </div>
        </SurfaceCardBody>
      </SurfaceCard>
    );
  }

  // GC / FC default view
  const { billedToDate, totalPaid, retainageAmount } = financials;
  const outstandingBalance = billedToDate - totalPaid - retainageAmount;

  return (
    <SurfaceCard data-sasha-card="Billing & Cash">
      <SurfaceCardHeader title="Billing & Cash Position" />
      <SurfaceCardBody className="pt-0">
        <RowList
          dividerBefore={3}
          rows={[
            { label: 'Total Invoiced', value: fmt(billedToDate) },
            { label: 'Total Paid', value: fmt(totalPaid), color: totalPaid > 0 ? 'green' : undefined },
            { label: 'Retainage Held', value: fmt(retainageAmount), color: retainageAmount > 0 ? 'amber' : undefined },
            { label: 'Outstanding', value: fmt(outstandingBalance), color: outstandingBalance > 0 ? 'amber' : outstandingBalance < 0 ? 'red' : undefined, bold: true },
          ]}
        />
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
