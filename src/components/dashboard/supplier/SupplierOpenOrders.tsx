import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import type { OpenPO } from '@/hooks/useSupplierDashboardData';

const statusStyles: Record<string, string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PRICED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ORDERED: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

interface Props { pos: OpenPO[]; }

export function SupplierOpenOrders({ pos }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Open Purchase Orders
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">{pos.length} open</p>
      </div>

      <div className="divide-y divide-border">
        {pos.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[0.78rem] text-muted-foreground">No open orders</p>
          </div>
        ) : (
          pos.map(po => (
            <button
              key={po.id}
              onClick={() => navigate(`/project/${po.projectId}/materials/purchase-orders/${po.id}`)}
              className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[0.78rem] font-semibold text-foreground truncate">
                  {po.poNumber}
                </div>
                <div className="text-[0.67rem] text-muted-foreground truncate">
                  {po.projectName} · {po.poName}
                </div>
              </div>
              <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${statusStyles[po.status] || 'bg-accent text-muted-foreground'}`}>
                {po.status}
              </span>
              <span className="text-[0.72rem] font-semibold text-foreground flex-shrink-0">
                {formatCurrency(po.total)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
