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
  accent?: string;
}

/**
 * Project Overview quick-actions row.
 * Pinned at the top of GC/TC/FC overviews. Role- and mode-aware.
 * In T&M mode "Create CO" is rebranded "Create Work Order" (same route).
 */
export function QuickActionsBar({ projectId, role, isTM = false, onNavigate }: Props) {
  const navigate = useNavigate();

  const coAction: Action = {
    key: 'co',
    label: isTM ? 'New Work Order' : 'New Change Order',
    icon: isTM ? Hammer : ClipboardEdit,
    onClick: () => navigate(`/project/${projectId}/change-orders/new`),
    accent: C.blue,
  };

  const invoiceAction: Action = {
    key: 'invoice',
    label: 'New Invoice',
    icon: FileText,
    onClick: () => onNavigate('invoices?action=create'),
    accent: C.amber,
  };

  const poAction: Action = {
    key: 'po',
    label: 'New Purchase Order',
    icon: ShoppingCart,
    onClick: () => onNavigate('purchase-orders?action=create'),
    accent: C.green,
  };

  const rfiAction: Action = {
    key: 'rfi',
    label: 'New RFI',
    icon: HelpCircle,
    onClick: () => navigate(`/project/${projectId}/rfis/new`),
    accent: C.purple,
  };

  let actions: Action[] = [];
  if (role === 'GC') actions = [invoiceAction, coAction, poAction, rfiAction];
  else if (role === 'TC') actions = [invoiceAction, coAction, poAction, rfiAction];
  else if (role === 'FC') actions = isTM ? [invoiceAction, coAction, rfiAction] : [invoiceAction, rfiAction];

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: 10,
        borderRadius: 12,
        background: C.surface ?? '#fff',
        border: `1px solid ${C.border}`,
        ...fontLabel,
      }}
      aria-label="Project quick actions"
    >
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            onClick={a.onClick}
            className="hover:brightness-95 transition"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${a.accent ?? C.ink}`,
              background: '#fff',
              color: C.ink,
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              ...fontLabel,
            }}
          >
            <Icon size={14} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
