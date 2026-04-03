import { useNavigate } from 'react-router-dom';
import { FileText, Package, Wrench, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface ProjectActionQueueProps {
  financials: ProjectFinancials;
  projectId: string;
  onNavigate: (tab: string) => void;
}

export function ProjectActionQueue({ financials, projectId, onNavigate }: ProjectActionQueueProps) {
  const actions: { icon: React.ElementType; label: string; detail: string; color: string; onClick: () => void }[] = [];

  // Pending invoices
  const pendingInvoices = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');
  if (pendingInvoices.length > 0) {
    actions.push({
      icon: FileText,
      label: `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} to review`,
      detail: formatCurrency(pendingInvoices.reduce((s, i) => s + i.total_amount, 0)),
      color: 'text-amber-600 dark:text-amber-400',
      onClick: () => onNavigate('invoices'),
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Action Queue</h3>
      </div>
      <div className="divide-y divide-border/40">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button key={i} onClick={action.onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-left">
              <Icon className={cn('w-4 h-4 shrink-0', action.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{action.detail}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
