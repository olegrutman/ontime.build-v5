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
} from 'lucide-react';
import { POWizardV2LineItem } from '@/types/poWizardV2';

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
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Items</h2>
            <p className="text-sm text-muted-foreground">Step 2 of 3 • Add Materials</p>
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
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.specs}
                        </p>
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
                          {item.item_notes && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {item.item_notes}
                            </span>
                          )}
                        </div>
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
            ))}

            {/* Add More Button */}
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={onAddItem}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Item
            </Button>
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
