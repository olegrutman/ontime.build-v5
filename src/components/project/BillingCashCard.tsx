import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';

function fmt(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

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
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className={cn("flex items-center justify-between", dividerBefore != null && i === dividerBefore && "border-t pt-2")}>
          <span className={cn("text-sm", row.bold ? "font-medium text-foreground" : "text-muted-foreground")}>{row.label}</span>
          <span className={cn("tabular-nums", row.bold ? "text-lg font-bold" : "text-sm font-semibold", colorClass(row.color))}>
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

  // TC split view
  if (viewerRole === 'Trade Contractor') {
    const {
      receivablesInvoiced, receivablesCollected, receivablesRetainage,
      payablesInvoiced, payablesPaid, payablesRetainage,
    } = financials;

    const receivablesOutstanding = receivablesInvoiced - receivablesCollected - receivablesRetainage;
    const payablesOutstanding = payablesInvoiced - payablesPaid - payablesRetainage;
    const netCash = receivablesCollected - payablesPaid;

    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Billing & Cash Position</p>

        {/* Receivables */}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Receivables (from GC)</p>
        <RowList
          dividerBefore={3}
          rows={[
            { label: 'Invoiced to GC', value: fmt(receivablesInvoiced) },
            { label: 'Collected', value: fmt(receivablesCollected), color: receivablesCollected > 0 ? 'green' : undefined },
            { label: 'Retainage Held', value: fmt(receivablesRetainage), color: receivablesRetainage > 0 ? 'amber' : undefined },
            { label: 'Outstanding', value: fmt(receivablesOutstanding), color: receivablesOutstanding > 0 ? 'amber' : undefined, bold: true },
          ]}
        />

        <div className="border-t my-3" />

        {/* Payables */}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Payables (to FC & Suppliers)</p>
        <RowList
          dividerBefore={3}
          rows={[
            { label: 'Invoices Received', value: fmt(payablesInvoiced) },
            { label: 'Paid Out', value: fmt(payablesPaid), color: payablesPaid > 0 ? 'green' : undefined },
            { label: 'Retainage Held', value: fmt(payablesRetainage), color: payablesRetainage > 0 ? 'amber' : undefined },
            { label: 'Outstanding', value: fmt(payablesOutstanding), color: payablesOutstanding > 0 ? 'amber' : undefined, bold: true },
          ]}
        />

        <div className="border-t my-3" />

        {/* Net */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-foreground">Net Cash Position</span>
            <p className="text-[10px] text-muted-foreground">Collected − Paid</p>
          </div>
          <span className={cn("text-lg font-bold tabular-nums", netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {fmt(netCash)}
          </span>
        </div>
      </div>
    );
  }

  // GC / FC default view
  const { billedToDate, totalPaid, retainageAmount } = financials;
  const outstandingBalance = billedToDate - totalPaid - retainageAmount;

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Billing & Cash Position</p>
      <RowList
        dividerBefore={3}
        rows={[
          { label: 'Total Invoiced', value: fmt(billedToDate) },
          { label: 'Total Paid', value: fmt(totalPaid), color: totalPaid > 0 ? 'green' : undefined },
          { label: 'Retainage Held', value: fmt(retainageAmount), color: retainageAmount > 0 ? 'amber' : undefined },
          { label: 'Outstanding', value: fmt(outstandingBalance), color: outstandingBalance > 0 ? 'amber' : outstandingBalance < 0 ? 'red' : undefined, bold: true },
        ]}
      />
    </div>
  );
}
