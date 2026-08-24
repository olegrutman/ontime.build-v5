import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardEdit, ShoppingCart, HelpCircle, Hammer, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Role = 'GC' | 'TC' | 'FC';

interface Props {
  projectId: string;
  role: Role;
  isTM?: boolean;
  onNavigate: (tab: string) => void;
}

interface Action {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

/**
 * Project Overview quick-actions command bar.
 * Uses the shared Button primitive and semantic tokens so it stays aligned with
 * the command-center overview and never falls back to the old inline-card style.
 */
export function QuickActionsBar({ projectId, role, isTM = false, onNavigate }: Props) {
  const navigate = useNavigate();

  const coAction: Action = {
    key: 'co',
    label: isTM ? 'Work Order' : 'Change Order',
    icon: isTM ? Hammer : ClipboardEdit,
    onClick: () => navigate(`/project/${projectId}/change-orders/start`),
  };

  const invoiceAction: Action = {
    key: 'invoice',
    label: 'New Invoice',
    icon: FileText,
    onClick: () => onNavigate('invoices?action=create'),
  };

  const poAction: Action = {
    key: 'po',
    label: 'Purchase Order',
    icon: ShoppingCart,
    onClick: () => onNavigate('purchase-orders?action=create'),
  };

  const rfiAction: Action = {
    key: 'rfi',
    label: 'New RFI',
    icon: HelpCircle,
    onClick: () => navigate(`/project/${projectId}/rfis/new`),
  };

  let actions: Action[] = [];
  if (role === 'GC' || role === 'TC') actions = [invoiceAction, coAction, poAction, rfiAction];
  else actions = isTM ? [invoiceAction, coAction, rfiAction] : [invoiceAction, rfiAction];

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      aria-label="Project quick actions"
    >
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Button
            key={a.key}
            type="button"
            variant="outline"
            onClick={a.onClick}
            className="h-11 justify-start rounded-2xl border-border bg-card px-3 text-[0.68rem] font-bold uppercase tracking-normal text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-muted"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{a.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
