import { cn } from '@/lib/utils';
import { Package, Check, X, AlertTriangle } from 'lucide-react';

interface DeliveryEntry {
  po_id: string;
  po_number?: string;
  status: string;
  notes?: string;
}

interface DeliveriesCardProps {
  deliveries: DeliveryEntry[];
  onChange: (deliveries: DeliveryEntry[]) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'received', label: 'Received', icon: Check, color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  { value: 'not_received', label: 'Not Received', icon: X, color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' },
  { value: 'partial', label: 'Partial', icon: AlertTriangle, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
];

export function DeliveriesCard({ deliveries, onChange, disabled }: DeliveriesCardProps) {
  if (deliveries.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-4 space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> Deliveries
        </h3>
        <p className="text-xs text-muted-foreground text-center py-3">No deliveries expected today</p>
      </div>
    );
  }

  const updateStatus = (poId: string, newStatus: string) => {
    if (disabled) return;
    const updated = deliveries.map(d =>
      d.po_id === poId ? { ...d, status: newStatus } : d
    );
    onChange(updated);
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" /> Deliveries
      </h3>
      <div className="space-y-3">
        {deliveries.map(d => (
          <div key={d.po_id} className="space-y-2">
            <span className="text-sm font-medium">{d.po_number || 'PO'}</span>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isActive = d.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(d.po_id, opt.value)}
                    disabled={disabled}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      isActive ? opt.color : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
