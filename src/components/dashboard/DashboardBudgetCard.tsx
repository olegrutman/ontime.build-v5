import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

interface Props {
  financials: {
    totalRevenue: number;
    totalBilled: number;
  };
  billing: {
    outstandingToPay: number;
  };
  activeProjectName: string | null;
  activeProjectId?: string | null;
}

interface BudgetRow {
  color: string;
  label: string;
  value: number;
  percent: number;
}

export function DashboardBudgetCard({ financials, billing, activeProjectName, activeProjectId }: Props) {
  const navigate = useNavigate();
  const total = financials.totalRevenue || 0;
  const paid = financials.totalBilled || 0;
  const pending = billing.outstandingToPay || 0;
  const remaining = Math.max(0, total - paid - pending);

  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const remainingPct = total > 0 ? Math.round((remaining / total) * 100) : 0;

  const rows: BudgetRow[] = [
    { color: 'bg-emerald-500', label: 'Paid', value: paid, percent: paidPct },
    { color: 'bg-primary', label: 'Pending', value: pending, percent: pendingPct },
    { color: 'bg-border', label: 'Remaining', value: remaining, percent: remainingPct },
  ];

  const [animatedWidths, setAnimatedWidths] = useState<number[]>(rows.map(() => 0));

  useEffect(() => {
    const t = setTimeout(() => {
      setAnimatedWidths(rows.map(r => r.percent));
    }, 500);
    return () => clearTimeout(t);
  }, [paid, pending, remaining]);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Budget Overview</h3>
        <button
          onClick={() => activeProjectId && navigate(`/project/${activeProjectId}`)}
          className="text-[0.75rem] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Details →
        </button>
      </div>

      <div className="mx-4 mb-3 bg-accent border border-border rounded-md px-3.5 py-3">
        <div className="text-[0.68rem] text-muted-foreground uppercase tracking-wide mb-0.5">Contract Total</div>
        <div className="font-heading text-[1.6rem] md:text-[1.5rem] font-black text-foreground leading-none">
          {formatCurrency(total)}
        </div>
        {activeProjectName && (
          <div className="text-[0.68rem] text-muted-foreground mt-1">{activeProjectName}</div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3.5 md:space-y-3">
        {rows.map((row, idx) => (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${row.color}`} />
                <span className="text-[0.82rem] md:text-[0.78rem] text-foreground">{row.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.82rem] md:text-[0.78rem] font-semibold text-foreground">{formatCurrency(row.value)}</span>
                <span className="text-[0.7rem] md:text-[0.68rem] text-muted-foreground">{row.percent}%</span>
              </div>
            </div>
            <div className="h-1.5 md:h-[3px] bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${row.color}`}
                style={{ width: `${animatedWidths[idx]}%`, transitionDelay: `${200 + idx * 100}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
