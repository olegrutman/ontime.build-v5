import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, Check } from 'lucide-react';
import { CatalogProduct, POWizardV2LineItem } from '@/types/poWizardV2';

interface QuantityPanelProps {
  product: CatalogProduct;
  onAdd: (item: POWizardV2LineItem) => void;
  onClose: () => void;
}

export function QuantityPanel({ product, onAdd, onClose }: QuantityPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitMode, setUnitMode] = useState<'EACH' | 'BUNDLE'>('EACH');
  const [notes, setNotes] = useState('');

  const hasBundle = !!product.bundle_type && !!product.bundle_qty;

  const formatSpecs = () => {
    const parts: string[] = [];
    if (product.dimension) parts.push(product.dimension);
    if (product.length) parts.push(product.length);
    if (product.color) parts.push(product.color);
    if (product.thickness) parts.push(product.thickness);
    return parts.join(' | ');
  };

  const handleAdd = () => {
    const item: POWizardV2LineItem = {
      id: crypto.randomUUID(),
      catalog_item_id: product.id,
      supplier_sku: product.supplier_sku,
      name: product.name || product.description,
      specs: formatSpecs(),
      quantity,
      unit_mode: unitMode,
      bundle_count: unitMode === 'BUNDLE' ? product.bundle_qty ?? undefined : undefined,
      bundle_name: unitMode === 'BUNDLE' ? product.bundle_type ?? undefined : undefined,
      item_notes: notes || undefined,
      uom: product.uom_default,
    };
    onAdd(item);
    onClose();
  };

  const incrementQty = () => setQuantity(q => q + 1);
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="p-4 space-y-4">
      {/* Product Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h3 className="font-semibold">{product.name || product.description}</h3>
          <p className="text-sm text-muted-foreground">SKU: {product.supplier_sku}</p>
          <p className="text-sm text-muted-foreground mt-1">{formatSpecs()}</p>
        </CardContent>
      </Card>

      {/* Quantity Stepper */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Quantity</Label>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={decrementQty}
            disabled={quantity <= 1}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <span className="text-3xl font-bold w-20 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={incrementQty}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Unit Mode */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Unit</Label>
        <div className="flex gap-2">
          <Button
            variant={unitMode === 'EACH' ? 'default' : 'outline'}
            className="flex-1 h-12"
            onClick={() => setUnitMode('EACH')}
          >
            Each ({product.uom_default})
          </Button>
          {hasBundle && (
            <Button
              variant={unitMode === 'BUNDLE' ? 'default' : 'outline'}
              className="flex-1 h-12"
              onClick={() => setUnitMode('BUNDLE')}
            >
              {product.bundle_type} ({product.bundle_qty})
            </Button>
          )}
        </div>
      </div>

      {/* Optional Notes */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Notes (Optional)</Label>
        <Input
          placeholder="Add a note for this item..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Add Button */}
      <Button
        className="w-full h-14 text-base"
        onClick={handleAdd}
      >
        <Check className="h-5 w-5 mr-2" />
        Add to PO
      </Button>
    </div>
  );
}
