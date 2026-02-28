import { Receipt } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

interface BillingCashTileProps {
  financials: ProjectFinancials;
}

export function BillingCashTile({ financials }: BillingCashTileProps) {
  const { viewerRole, billedToDate, totalPaid, retainageAmount } = financials;

  if (viewerRole === 'Supplier') return null;

  const outstandingBalance = billedToDate - totalPaid - retainageAmount;

  const rows = [
    { label: 'Total Invoiced', value: billedToDate },
    { label: 'Total Paid', value: totalPaid, color: 'green' as const },
    { label: 'Retainage Held', value: retainageAmount, color: retainageAmount > 0 ? 'amber' as const : undefined },
    { label: 'Outstanding Balance', value: outstandingBalance, color: outstandingBalance > 0 ? 'amber' as const : outstandingBalance < 0 ? 'red' as const : undefined },
  ];

  return (
    <div className="border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Billing & Cash Position
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className={`text-sm font-semibold tabular-nums ${
              row.color === 'green' ? 'text-green-600 dark:text-green-400' :
              row.color === 'red' ? 'text-red-600 dark:text-red-400' :
              row.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
              'text-foreground'
            }`}>
              {fmt(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
