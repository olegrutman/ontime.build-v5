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

export function BillingCashCard({ financials }: BillingCashCardProps) {
  const { loading, viewerRole, billedToDate, totalPaid, retainageAmount, outstanding } = financials;

  if (loading) return null;
  // Supplier and FC billing is shown inline in hero card
  if (viewerRole === 'Supplier') return null;

  const outstandingBalance = billedToDate - totalPaid - retainageAmount;

  const rows = [
    { label: 'Total Invoiced', value: fmt(billedToDate) },
    { label: 'Total Paid', value: fmt(totalPaid), color: totalPaid > 0 ? 'green' as const : undefined },
    { label: 'Retainage Held', value: fmt(retainageAmount), color: retainageAmount > 0 ? 'amber' as const : undefined },
    { label: 'Outstanding', value: fmt(outstandingBalance), color: outstandingBalance > 0 ? 'amber' as const : outstandingBalance < 0 ? 'red' as const : undefined, bold: true },
  ];

  const colorClass = (c?: 'green' | 'red' | 'amber') =>
    c === 'green' ? 'text-green-600 dark:text-green-400'
    : c === 'red' ? 'text-red-600 dark:text-red-400'
    : c === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : 'text-foreground';

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Billing & Cash Position</p>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className={cn("flex items-center justify-between", i === rows.length - 1 && "border-t pt-2.5")}>
            <span className={cn("text-sm", row.bold ? "font-medium text-foreground" : "text-muted-foreground")}>{row.label}</span>
            <span className={cn("tabular-nums", row.bold ? "text-lg font-bold" : "text-sm font-semibold", colorClass(row.color))}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
