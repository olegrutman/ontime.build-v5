import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { EstimateRow } from '@/hooks/useSupplierDashboardData';

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface Props { estimates: EstimateRow[]; }

export function SupplierEstimateCatalog({ estimates }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Estimates → Orders
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">
          {estimates.length} active estimate{estimates.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-3 space-y-2">
        {estimates.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[0.78rem] text-muted-foreground">No estimates yet</p>
          </div>
        ) : (
          estimates.slice(0, 6).map(est => (
            <button
              key={est.id}
              onClick={() => navigate(`/project/${est.projectId}?tab=estimates`)}
              className="w-full text-left bg-accent/30 border border-border rounded-md px-3 py-2.5 hover:bg-accent transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[0.78rem] font-semibold text-foreground truncate">{est.name}</div>
                  <div className="text-[0.67rem] text-muted-foreground truncate">{est.projectName}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${statusBadge[est.status] || statusBadge.DRAFT}`}>
                    {est.status}
                  </span>
                  <span className="text-[0.72rem] font-bold text-foreground">
                    {formatCurrency(est.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Pack tags */}
              {est.packNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {est.packNames.slice(0, 4).map(p => (
                    <span key={p} className="text-[0.58rem] bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary-foreground px-1.5 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                  {est.packNames.length > 4 && (
                    <span className="text-[0.58rem] text-muted-foreground">+{est.packNames.length - 4}</span>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${est.orderedPercent}%` }}
                  />
                </div>
                <span className="text-[0.65rem] font-semibold text-muted-foreground flex-shrink-0">
                  {est.orderedPercent}% ordered
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
