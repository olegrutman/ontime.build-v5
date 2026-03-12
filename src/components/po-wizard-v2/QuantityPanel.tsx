import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, Check, Package, Ruler } from 'lucide-react';
import { CatalogProduct, POWizardV2LineItem } from '@/types/poWizardV2';

interface QuantityPanelProps {
  product: CatalogProduct;
  onAdd: (item: POWizardV2LineItem) => void;
  onUpdate?: (item: POWizardV2LineItem) => void;
  onClose: () => void;
  editingItem?: POWizardV2LineItem | null;
  estimateUnitPrice?: number | null;
  estimateItemId?: string | null;
  estimatePackName?: string | null;
}

export function QuantityPanel({ product, onAdd, onUpdate, onClose, editingItem, estimateUnitPrice, estimateItemId, estimatePackName }: QuantityPanelProps) {
  const isEditing = !!editingItem;
  
  // Detection
  const isEngineered = product.category === 'Engineered';
  const hasBundle = !!product.bundle_type && !!product.bundle_qty;
  const bundleQty = product.bundle_qty || 0;

  // State for engineered lumber - pre-fill if editing
  const [pieces, setPieces] = useState(() => 
    editingItem?.is_engineered ? editingItem.quantity : 1
  );
  const [lengthFt, setLengthFt] = useState(() => 
    editingItem?.length_ft || 12
  );
  const computedLf = pieces * lengthFt;

  // State for standard/bundle products - pre-fill if editing
  const [orderMode, setOrderMode] = useState<'bundle' | 'each'>(() => {
    if (editingItem) {
      return editingItem.unit_mode === 'BUNDLE' ? 'bundle' : 'each';
    }
    return hasBundle ? 'bundle' : 'each';
  });
  const [quantity, setQuantity] = useState(() => {
    if (editingItem && !editingItem.is_engineered) {
      return editingItem.quantity;
    }
    return hasBundle ? bundleQty : 1;
  });
  const [notes, setNotes] = useState(() => editingItem?.item_notes || '');

  // Smart detection: quantity matches bundle = full bundle
  const isFullBundle = hasBundle && quantity === bundleQty && orderMode === 'bundle';
  const isModifiedBundle = hasBundle && orderMode === 'bundle' && quantity !== bundleQty;

  // When order mode changes, update quantity appropriately
  useEffect(() => {
    if (orderMode === 'bundle' && hasBundle) {
      setQuantity(bundleQty);
    } else if (orderMode === 'each' && !isEditing) {
      setQuantity(1);
    }
  }, [orderMode, hasBundle, bundleQty, isEditing]);

  const formatSpecs = () => {
    const parts: string[] = [];
    if (product.dimension) parts.push(product.dimension);
    if (product.length) parts.push(product.length);
    if (product.color) parts.push(product.color);
    if (product.thickness) parts.push(product.thickness);
    if (product.wood_species) parts.push(product.wood_species);
    return parts.join(' | ');
  };

  const handleSubmit = () => {
    // Determine pricing fields
    const resolvedUnitPrice = editingItem?.unit_price ?? estimateUnitPrice ?? null;
    const resolvedEstItemId = editingItem?.source_estimate_item_id ?? estimateItemId ?? null;
    const resolvedPackName = editingItem?.source_pack_name ?? estimatePackName ?? null;
    const resolvedPriceSource = editingItem?.price_source ?? (resolvedUnitPrice != null && resolvedEstItemId ? 'FROM_ESTIMATE' as const : null);

    if (isEngineered) {
      const computedLineTotal = resolvedUnitPrice != null ? pieces * lengthFt * resolvedUnitPrice : null;
      const item: POWizardV2LineItem = {
        id: editingItem?.id || crypto.randomUUID(),
        catalog_item_id: product.id,
        supplier_sku: product.supplier_sku,
        name: product.name || product.description,
        specs: formatSpecs(),
        quantity: pieces,
        unit_mode: 'EACH',
        uom: 'LF',
        length_ft: lengthFt,
        computed_lf: computedLf,
        is_engineered: true,
        item_notes: notes || undefined,
        unit_price: resolvedUnitPrice,
        line_total: computedLineTotal,
        source_estimate_item_id: resolvedEstItemId,
        source_pack_name: resolvedPackName,
        price_source: resolvedPriceSource,
        original_unit_price: editingItem?.original_unit_price ?? resolvedUnitPrice,
      };
      
      if (isEditing && onUpdate) {
        onUpdate(item);
      } else {
        onAdd(item);
      }
    } else {
      const computedLineTotal = resolvedUnitPrice != null ? quantity * resolvedUnitPrice : null;
      const item: POWizardV2LineItem = {
        id: editingItem?.id || crypto.randomUUID(),
        catalog_item_id: product.id,
        supplier_sku: product.supplier_sku,
        name: product.name || product.description,
        specs: formatSpecs(),
        quantity,
        unit_mode: isFullBundle ? 'BUNDLE' : 'EACH',
        bundle_count: isFullBundle ? bundleQty : undefined,
        bundle_name: isFullBundle ? product.bundle_type ?? undefined : undefined,
        uom: product.uom_default,
        item_notes: notes || undefined,
        unit_price: resolvedUnitPrice,
        line_total: computedLineTotal,
        source_estimate_item_id: resolvedEstItemId,
        source_pack_name: resolvedPackName,
        price_source: resolvedPriceSource,
        original_unit_price: editingItem?.original_unit_price ?? resolvedUnitPrice,
      };
      
      if (isEditing && onUpdate) {
        onUpdate(item);
      } else {
        onAdd(item);
      }
    }
    onClose();
  };

  // Steppers
  const incrementPieces = () => setPieces(p => p + 1);
  const decrementPieces = () => setPieces(p => Math.max(1, p - 1));
  const incrementLength = () => setLengthFt(l => Math.min(60, l + 1));
  const decrementLength = () => setLengthFt(l => Math.max(1, l - 1));
  const incrementQty = () => setQuantity(q => q + 1);
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="h-full overflow-y-auto min-h-0">
      <div className="p-4 space-y-4">
      {/* Product Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h3 className="font-semibold">{product.name || product.description}</h3>
          <p className="text-sm text-muted-foreground">SKU: {product.supplier_sku}</p>
          <p className="text-sm text-muted-foreground mt-1">{formatSpecs()}</p>
          {isEngineered && (
            <p className="text-xs text-primary mt-2">📐 Priced per Linear Foot</p>
          )}
        </CardContent>
      </Card>

      {isEngineered ? (
        /* ============ ENGINEERED LUMBER MODE ============ */
        <>
          {/* Pieces Stepper */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">How many pieces?</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={decrementPieces}
                disabled={pieces <= 1}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <Input
                type="number"
                value={pieces}
                onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 0))}
                onBlur={() => { if (!pieces || pieces < 1) setPieces(1); }}
                className="text-3xl font-bold w-24 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={incrementPieces}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Length Stepper */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Length per piece (ft)</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={decrementLength}
                disabled={lengthFt <= 1}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-3xl font-bold w-20 text-center">{lengthFt}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={incrementLength}
                disabled={lengthFt >= 60}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Total LF Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Ruler className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Total: {computedLf} Linear Feet</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ({pieces} {pieces === 1 ? 'piece' : 'pieces'} × {lengthFt} ft each)
              </p>
            </CardContent>
          </Card>
        </>
      ) : hasBundle ? (
        /* ============ BUNDLE MODE ============ */
        <>
          {/* Order Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Order as:</Label>
            <div className="space-y-2">
              <Button
                variant={orderMode === 'bundle' ? 'default' : 'outline'}
                className="w-full h-12 justify-start"
                onClick={() => setOrderMode('bundle')}
              >
                <Package className="h-5 w-5 mr-3" />
                {product.bundle_type} of {bundleQty}
              </Button>
              <Button
                variant={orderMode === 'each' ? 'default' : 'outline'}
                className="w-full h-12 justify-start"
                onClick={() => setOrderMode('each')}
              >
                Individual Pieces
              </Button>
            </div>
          </div>

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

          {/* Status Message */}
          <Card className={isFullBundle ? 'bg-primary/5 border-primary/20' : 'bg-amber-500/10 border-amber-500/30'}>
            <CardContent className="p-3 text-center">
              {isFullBundle ? (
                <p className="text-sm font-medium">
                  📦 Ordering: 1 {product.bundle_type} ({bundleQty} pieces)
                </p>
              ) : isModifiedBundle ? (
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  ⚠️ Modified: {quantity} pieces (not a full {product.bundle_type?.toLowerCase()})
                </p>
              ) : (
                <p className="text-sm font-medium">
                  Ordering: {quantity} individual {quantity === 1 ? 'piece' : 'pieces'}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* ============ STANDARD MODE ============ */
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
      )}

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

      {/* Submit Button */}
      <Button
        className="w-full h-14 text-base"
        onClick={handleSubmit}
      >
        <Check className="h-5 w-5 mr-2" />
        {isEditing ? 'Update Item' : 'Add to PO'}
      </Button>
      </div>
    </div>
  );
}
