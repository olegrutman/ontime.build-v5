import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  // Compute live totals
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
      return <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">Supplier Adjusted</Badge>;
    }
    if (item.source_estimate_item_id && item.unit_price != null) {
      return <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-700 dark:text-emerald-400">From Estimate</Badge>;
    }
    if (!item.source_estimate_item_id && item.unit_price == null) {
      return <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">Needs Pricing</Badge>;
    }
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
              Step 2 of 3
            </span>
            <h2 className="text-lg font-semibold mt-1">Items</h2>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {items.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    Pack: <span className="font-medium text-foreground">"{sourcePackName}"</span>
                  </span>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-sm font-medium shrink-0" onClick={onClearPack}>
                  Change Pack
                </Button>
              </div>
            )}

            {/* Item List */}
            {items.map((item) => {
              const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.specs}
                          </p>
                          {item.source_pack_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Pack: {item.source_pack_name}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {item.is_engineered && item.length_ft ? (
                              <>
                                <Badge variant="outline">
                                  {item.quantity} pcs
                                </Badge>
                                <Badge variant="outline">
                                  {item.length_ft}' each
                                </Badge>
                                <Badge variant="secondary" className="font-semibold">
                                  = {item.computed_lf} LF
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline">
                                {item.quantity} {item.unit_mode === 'BUNDLE' ? item.bundle_name || 'BDL' : item.uom}
                              </Badge>
                            )}
                            {getSourceTag(item)}
                            {item.item_notes && (
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {item.item_notes}
                              </span>
                            )}
                          </div>
                          {/* Pricing row */}
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {item.unit_price != null
                                ? `${formatCurrency(item.unit_price)} / ${item.uom}`
                                : '-- / ' + item.uom}
                            </span>
                            <span className="font-medium">
                              {lineTotal != null ? formatCurrency(lineTotal) : '--'}
                            </span>
                          </div>
                          {/* Supplier adjusted delta */}
                          {item.price_adjusted_by_supplier && item.original_unit_price != null && item.unit_price != null && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Adjusted from {formatCurrency(item.original_unit_price)} → {formatCurrency(item.unit_price)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => onEditItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive hover:text-destructive"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add More Button */}
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={onAddItem}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Item
            </Button>

            {/* Sticky Totals Summary */}
            {items.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1.5 text-sm">
                  {totals.estimateSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimate Items</span>
                      <span>{formatCurrency(totals.estimateSubtotal)}</span>
                    </div>
                  )}
                  {totals.additionalSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Additional Items</span>
                      <span>{formatCurrency(totals.additionalSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.unpricedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs mt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{totals.unpricedCount} item{totals.unpricedCount !== 1 ? 's' : ''} need supplier pricing</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t bg-background space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={onNext}
            disabled={!canAdvance}
          >
            Review PO
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
