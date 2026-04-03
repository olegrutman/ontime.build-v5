import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface ProjectActionQueueProps {
  financials: ProjectFinancials;
  projectId: string;
  onNavigate: (tab: string) => void;
}

export function ProjectActionQueue({ financials, projectId, onNavigate }: ProjectActionQueueProps) {
  const actions: { label: string; onClick: () => void }[] = [];

  const pendingInvoices = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');
  if (pendingInvoices.length > 0) {
    actions.push({
      label: `Approve ${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''}`,
      onClick: () => onNavigate('invoices'),
    });
  }

  if (financials.materialOrderedPending > 0) {
    actions.push({
      label: 'Confirm pending delivery date',
      onClick: () => onNavigate('purchase-orders'),
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="rounded-3xl border border-border/60 shadow-sm p-5">
      <h3 className="text-xl font-semibold tracking-tight">Action queue</h3>
      <p className="text-sm text-muted-foreground">Simple enough for a non-technical user</p>
      <div className="mt-4 space-y-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="w-full rounded-2xl border border-border/60 px-4 py-3 flex items-center justify-between bg-accent/20 hover:bg-accent/40 transition-colors text-left"
          >
            <span className="text-sm font-medium">{action.label}</span>
            <span className="text-primary text-xs font-semibold">Go</span>
          </button>
        ))}
      </div>
    </div>
  );
}
