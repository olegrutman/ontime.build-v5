import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';

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
    <SurfaceCard>
      <SurfaceCardHeader
        title="Action queue"
        subtitle="Simple enough for a non-technical user"
      />
      <SurfaceCardBody className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="w-full rounded-xl border border-border/60 px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-accent/20 hover:bg-accent/40 transition-colors text-left"
          >
            <span className="text-[0.85rem] font-medium">{action.label}</span>
            <span className="text-primary text-[0.75rem] font-semibold">Go</span>
          </button>
        ))}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
