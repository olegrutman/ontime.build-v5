import { useState } from 'react';
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
import { OrderingModeToggle, OrderingMode } from './OrderingModeToggle';
import { EstimateSubTabs } from './EstimateSubTabs';

interface EstimatePackItem {
  id: string;
  supplier_sku: string | null;
  description: string;
  quantity: number;
  uom: string;
  catalog_item_id: string | null;
  pack_name: string | null;
}

interface EstimatePack {
  name: string;
  items: EstimatePackItem[];
}

interface ItemsScreenProps {
  items: POWizardV2LineItem[];
  onAddItem: () => void;
  onEditItem: (item: POWizardV2LineItem) => void;
  onRemoveItem: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  projectId: string;
  supplierId: string | null;
  onLoadPack: (items: POWizardV2LineItem[], estimateId: string, packName: string) => void;
  hasApprovedEstimate: boolean;
  onAddPSMItem: (item: POWizardV2LineItem) => void;
}

export function ItemsScreen({
  items,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onBack,
  onNext,
  canAdvance,
  projectId,
  supplierId,
  onLoadPack,
  hasApprovedEstimate,
  onAddPSMItem,
}: ItemsScreenProps) {
  const [mode, setMode] = useState<OrderingMode>(hasApprovedEstimate ? 'estimate' : 'catalog');

  const handleSelectPack = (pack: EstimatePack, estimateId: string) => {
    // Convert estimate pack items to PO line items
    const lineItems: POWizardV2LineItem[] = pack.items.map((item, idx) => ({
      id: `pack-${idx}-${Date.now()}`,
      catalog_item_id: item.catalog_item_id || '',
      supplier_sku: item.supplier_sku || '',
      name: item.description,
      specs: item.supplier_sku || '',
      quantity: item.quantity,
      unit_mode: 'EACH' as const,
      uom: item.uom,
      item_notes: item.catalog_item_id ? undefined : '⚠ Not in catalog',
    }));

    onLoadPack(lineItems, estimateId, pack.name);
  };

  // Show estimate browser when in estimate mode and no items loaded yet
  const showEstimateBrowser = mode === 'estimate' && items.length === 0;

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
        <OrderingModeToggle
          mode={mode}
          onChange={setMode}
          hasEstimate={hasApprovedEstimate}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showEstimateBrowser ? (
          <EstimateSubTabs
            projectId={projectId}
            supplierId={supplierId}
            onSelectPack={handleSelectPack}
            onSwitchToCatalog={() => setMode('catalog')}
            onAddPSMItem={onAddPSMItem}
          />
        ) : items.length === 0 ? (
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
