import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Pencil, 
  Trash2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { POWizardV2LineItem } from '@/types/poWizardV2';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ItemsScreenProps {
  items: POWizardV2LineItem[];
  onAddItem: () => void;
  onEditItem: (item: POWizardV2LineItem) => void;
  onRemoveItem: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  sourcePackName: string | null;
  onClearPack: () => void;
  hidePricing?: boolean;
}

export function ItemsScreen({
  items,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onBack,
  onNext,
  canAdvance,
  sourcePackName,
  onClearPack,
}: ItemsScreenProps) {
  const totals = useMemo(() => {
    let estimateSubtotal = 0;
    let additionalSubtotal = 0;
    let unpricedCount = 0;

    for (const item of items) {
      const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
      if (item.source_estimate_item_id) {
        estimateSubtotal += lineTotal ?? 0;
      } else if (item.unit_price != null) {
        additionalSubtotal += lineTotal ?? 0;
      }
      if (item.unit_price == null) {
        unpricedCount++;
      }
    }

    return {
      estimateSubtotal,
      additionalSubtotal,
      subtotal: estimateSubtotal + additionalSubtotal,
      unpricedCount,
    };
  }, [items]);

  function getSourceTag(item: POWizardV2LineItem) {
    if (item.price_adjusted_by_supplier) {
      return <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">Adjusted</Badge>;
    }
    if (item.source_estimate_item_id && item.unit_price != null) {
      return <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-700 dark:text-emerald-400">Est.</Badge>;
    }
    if (!item.source_estimate_item_id && item.unit_price == null) {
      return <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">Needs Price</Badge>;
    }
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Q-Header */}
      <div className="wz-q-header">
        <span className="wz-q-label">Step 2 of 3</span>
        <h2 className="wz-q-title">
          Items
          {items.length > 0 && (
            <span className="ml-2 text-base font-medium text-muted-foreground align-middle">
              ({items.length})
            </span>
          )}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No items yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add materials to your purchase order
            </p>
            <Button onClick={onAddItem} size="lg" className="h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <>
            {/* Pack source banner */}
            {sourcePackName && (
              <div className="wz-totals-bar flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate">
                    Pack: <span className="font-semibold text-primary">"{sourcePackName}"</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-secondary-foreground/70 hover:text-secondary-foreground shrink-0" onClick={onClearPack}>
                  Change
                </Button>
              </div>
            )}

            {/* Item rows */}
            <div className="divide-y divide-border">
              {items.map((item) => {
                const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
                return (
                  <div key={item.id} className="wz-item-row">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {getSourceTag(item)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.specs}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          {item.is_engineered && item.length_ft
                            ? `${item.quantity} pcs × ${item.length_ft}' = ${item.computed_lf} LF`
                            : `${item.quantity} ${item.unit_mode === 'BUNDLE' ? item.bundle_name || 'BDL' : item.uom}`}
                        </span>
                        {item.unit_price != null && (
                          <span className="text-muted-foreground">
                            @ {formatCurrency(item.unit_price)}/{item.uom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-semibold min-w-[60px] text-right">
                        {lineTotal != null ? formatCurrency(lineTotal) : '—'}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditItem(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemoveItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add More CTA */}
            <button className="wz-dashed-cta" onClick={onAddItem}>
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add Another Item</span>
            </button>

            {/* Totals bar */}
            <div className="wz-totals-bar space-y-1">
              {totals.estimateSubtotal > 0 && (
                <div className="flex justify-between text-sm text-secondary-foreground/70">
                  <span>Estimate Items</span>
                  <span>{formatCurrency(totals.estimateSubtotal)}</span>
                </div>
              )}
              {totals.additionalSubtotal > 0 && (
                <div className="flex justify-between text-sm text-secondary-foreground/70">
                  <span>Additional Items</span>
                  <span>{formatCurrency(totals.additionalSubtotal)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-secondary-foreground">Subtotal</span>
                <span className="wz-totals-value">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.unpricedCount > 0 && (
                <div className="flex items-center gap-1.5 text-primary text-xs pt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{totals.unpricedCount} item{totals.unpricedCount !== 1 ? 's' : ''} need supplier pricing</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="wz-footer flex gap-2">
        <Button variant="ghost" className="h-11" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button className="flex-1 h-11" onClick={onNext} disabled={!canAdvance}>
          Review Order
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
