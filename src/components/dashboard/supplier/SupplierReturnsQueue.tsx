import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import type { ReturnRow } from '@/hooks/useSupplierDashboardData';

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SUPPLIER_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  SCHEDULED: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  PICKED_UP: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PRICED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
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
                onClick={() => navigate(`/project/${ret.projectId}?tab=returns`)}
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
                  <span className="text-[0.6rem] font-bold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded flex-shrink-0">
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
