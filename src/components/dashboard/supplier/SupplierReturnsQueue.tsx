import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import type { ReturnRow } from '@/hooks/useSupplierDashboardData';

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  SUBMITTED: 'bg-type-sov/10 text-type-sov',
  SUPPLIER_REVIEW: 'bg-state-open-bg text-state-open-foreground',
  APPROVED: 'bg-state-approved-bg text-state-approved-foreground',
  REJECTED: 'bg-destructive/10 text-destructive',
  SCHEDULED: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  PICKED_UP: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PRICED: 'bg-state-approved-bg text-state-approved-foreground',
};

const urgencyBorder: Record<string, string> = {
  Emergency: 'border-l-red-500',
  Urgent: 'border-l-amber-500',
  Priority: 'border-l-blue-500',
  Standard: 'border-l-border',
};

interface Props { returns: ReturnRow[]; }

export function SupplierReturnsQueue({ returns }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Returns
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">{returns.length} active</p>
      </div>

      <div className="p-3 space-y-1.5">
        {returns.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[0.78rem] text-muted-foreground">No active returns</p>
          </div>
        ) : (
          returns.slice(0, 6).map(ret => {
            const needsAction = ['SUBMITTED', 'SUPPLIER_REVIEW'].includes(ret.status);
            return (
              <button
                key={ret.id}
                onClick={() => navigate(`/project/${ret.projectId}/returns`)}
                className={`w-full text-left border border-border rounded-md border-l-[3px] ${
                  urgencyBorder[ret.urgency || 'Standard']
                } px-3 py-2.5 hover:bg-accent transition-all flex items-center gap-2.5`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[0.78rem] font-semibold text-foreground truncate">
                    {ret.returnNumber}
                  </div>
                  <div className="text-[0.67rem] text-muted-foreground truncate">
                    {ret.projectName} · {ret.reason}
                  </div>
                </div>
                <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${statusStyles[ret.status] || statusStyles.DRAFT}`}>
                  {ret.status.replace('_', ' ')}
                </span>
                <span className="text-[0.72rem] font-semibold text-foreground flex-shrink-0">
                  {formatCurrency(ret.creditSubtotal)}
                </span>
                {needsAction && (
                  <span className="text-[0.6rem] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded flex-shrink-0">
                    Respond
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
