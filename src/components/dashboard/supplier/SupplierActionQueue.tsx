import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import type { ActionItem } from '@/hooks/useSupplierDashboardData';

const urgencyBorder: Record<string, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  blue: 'border-l-blue-500',
};

const urgencyBadge: Record<string, string> = {
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

interface Props { items: ActionItem[]; }

export function SupplierActionQueue({ items }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Action Queue
        </h3>
        {items.length > 0 && (
          <span className="text-[0.68rem] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-[1.8rem]">🎉</span>
            <p className="text-[0.82rem] text-muted-foreground mt-1">All caught up — no actions needed</p>
          </div>
        ) : (
          items.slice(0, 8).map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.actionUrl)}
              className={`w-full text-left bg-card border border-border rounded-md border-l-[3px] ${urgencyBorder[item.urgency]} px-3 py-2.5 hover:bg-accent hover:translate-x-px transition-all flex items-center gap-2.5`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[0.8rem] font-semibold text-foreground truncate">{item.title}</div>
                <div className="text-[0.7rem] text-muted-foreground truncate">{item.subtitle}</div>
              </div>
              {item.amount != null && (
                <span className="text-[0.72rem] font-semibold text-foreground flex-shrink-0 mr-2">
                  {formatCurrency(item.amount)}
                </span>
              )}
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${urgencyBadge[item.urgency]}`}>
                {item.actionLabel}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
