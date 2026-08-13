import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardEdit, ShoppingCart, HelpCircle, Hammer, type LucideIcon } from 'lucide-react';
import { C, fontLabel } from '@/components/shared/KpiCard';

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
 * Project Overview quick-actions grid.
 * Equal-width cells (2 up on mobile, 4 up from sm) with neutral card styling —
 * no colored rails, so the accent colour stays reserved for real alerts.
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
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      style={fontLabel}
      aria-label="Project quick actions"
    >
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={a.onClick}
            className="flex items-center gap-2 transition-colors hover:bg-muted/60 active:bg-muted"
            style={{
              padding: '11px 12px',
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: '#fff',
              color: C.ink,
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              cursor: 'pointer',
              textAlign: 'left',
              ...fontLabel,
            }}
          >
            <Icon size={15} style={{ color: C.faint, flexShrink: 0 }} />
            <span className="truncate">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
