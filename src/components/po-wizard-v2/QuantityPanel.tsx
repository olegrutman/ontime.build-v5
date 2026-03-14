import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, Check, Package, Ruler } from 'lucide-react';
import { CatalogProduct, POWizardV2LineItem } from '@/types/poWizardV2';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface QuantityPanelProps {
  product: CatalogProduct;
  onAdd: (item: POWizardV2LineItem) => void;
  onUpdate?: (item: POWizardV2LineItem) => void;
  onClose: () => void;
  editingItem?: POWizardV2LineItem | null;
  estimateUnitPrice?: number | null;
  estimateItemId?: string | null;
  estimatePackName?: string | null;
  hidePricing?: boolean;
}

export function QuantityPanel({ product, onAdd, onUpdate, onClose, editingItem, estimateUnitPrice, estimateItemId, estimatePackName, hidePricing = false }: QuantityPanelProps) {
  const isEditing = !!editingItem;
  
  const isEngineered = product.category === 'Engineered';
  const hasBundle = !!product.bundle_type && !!product.bundle_qty;
  const bundleQty = product.bundle_qty || 0;

  const [pieces, setPieces] = useState(() => 
    editingItem?.is_engineered ? editingItem.quantity : 1
  );
  const [lengthFt, setLengthFt] = useState(() => 
    editingItem?.length_ft || 12
  );
  const computedLf = pieces * lengthFt;

  const [orderMode, setOrderMode] = useState<'bundle' | 'each'>(() => {
    if (editingItem) return editingItem.unit_mode === 'BUNDLE' ? 'bundle' : 'each';
    return hasBundle ? 'bundle' : 'each';
  });
  const [quantity, setQuantity] = useState(() => {
    if (editingItem && !editingItem.is_engineered) return editingItem.quantity;
    return hasBundle ? bundleQty : 1;
  });
  const [notes, setNotes] = useState(() => editingItem?.item_notes || '');

  const isFullBundle = hasBundle && quantity === bundleQty && orderMode === 'bundle';
  const isModifiedBundle = hasBundle && orderMode === 'bundle' && quantity !== bundleQty;

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
    return parts.join(' · ');
  };

  // Compute line total for display
  const resolvedUnitPrice = editingItem?.unit_price ?? estimateUnitPrice ?? null;
  const displayLineTotal = isEngineered
    ? (resolvedUnitPrice != null ? computedLf * resolvedUnitPrice : null)
    : (resolvedUnitPrice != null ? quantity * resolvedUnitPrice : null);

  const handleSubmit = () => {
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
      if (isEditing && onUpdate) onUpdate(item); else onAdd(item);
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
      if (isEditing && onUpdate) onUpdate(item); else onAdd(item);
    }
    onClose();
  };

  const incrementPieces = () => setPieces(p => p + 1);
  const decrementPieces = () => setPieces(p => Math.max(1, p - 1));
  const incrementLength = () => setLengthFt(l => Math.min(60, l + 1));
  const decrementLength = () => setLengthFt(l => Math.max(1, l - 1));
  const incrementQty = () => setQuantity(q => q + 1);
  const decrementQty = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="h-full overflow-y-auto min-h-0">
      <div className="p-4 space-y-5">
        {/* Product summary card */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <h3 className="font-semibold text-sm">{product.name || product.description}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{product.supplier_sku} · {formatSpecs()}</p>
          {isEngineered && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Priced per Linear Foot
            </p>
          )}
        </div>

        {isEngineered ? (
          <>
            {/* Pieces */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pieces</Label>
              <div className="flex items-center justify-center gap-4">
                <button className="wz-stepper-btn" onClick={decrementPieces} disabled={pieces <= 1}>
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number" value={pieces}
                  onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 0))}
                  onBlur={() => { if (!pieces || pieces < 1) setPieces(1); }}
                  className="text-2xl font-bold w-20 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={1}
                />
                <button className="wz-stepper-btn" onClick={incrementPieces}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Length (ft)</Label>
              <div className="flex items-center justify-center gap-4">
                <button className="wz-stepper-btn" onClick={decrementLength} disabled={lengthFt <= 1}>
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number" value={lengthFt}
                  onChange={(e) => setLengthFt(Math.min(60, Math.max(1, parseInt(e.target.value) || 0)))}
                  onBlur={() => { if (!lengthFt || lengthFt < 1) setLengthFt(1); }}
                  className="text-2xl font-bold w-20 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={1} max={60}
                />
                <button className="wz-stepper-btn" onClick={incrementLength} disabled={lengthFt >= 60}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* LF total */}
            <div className="wz-totals-bar text-center">
              <p className="text-xs text-secondary-foreground/70 mb-1">
                {pieces} {pieces === 1 ? 'piece' : 'pieces'} × {lengthFt} ft
              </p>
              <span className="wz-totals-value">{computedLf} LF</span>
            </div>
          </>
        ) : hasBundle ? (
          <>
            {/* Order mode toggle */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Order As</Label>
              <div className="flex gap-2">
                <button
                  className={`wz-pill flex-1 ${orderMode === 'bundle' ? 'wz-pill--active' : 'wz-pill--inactive'}`}
                  onClick={() => setOrderMode('bundle')}
                >
                  <Package className="h-4 w-4 mr-1" />
                  {product.bundle_type} ({bundleQty})
                </button>
                <button
                  className={`wz-pill flex-1 ${orderMode === 'each' ? 'wz-pill--active' : 'wz-pill--inactive'}`}
                  onClick={() => setOrderMode('each')}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Quantity stepper */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</Label>
              <div className="flex items-center justify-center gap-4">
                <button className="wz-stepper-btn" onClick={decrementQty} disabled={quantity <= 1}>
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  type="number" value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  onBlur={() => { if (!quantity || quantity < 1) setQuantity(1); }}
                  className="text-2xl font-bold w-20 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={1}
                />
                <button className="wz-stepper-btn" onClick={incrementQty}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Status */}
            {isModifiedBundle && (
              <p className="text-xs text-center text-primary">
                ⚠ {quantity} pieces (not a full {product.bundle_type?.toLowerCase()})
              </p>
            )}
          </>
        ) : (
          /* Standard quantity */
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</Label>
            <div className="flex items-center justify-center gap-4">
              <button className="wz-stepper-btn" onClick={decrementQty} disabled={quantity <= 1}>
                <Minus className="h-4 w-4" />
              </button>
              <Input
                type="number" value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                onBlur={() => { if (!quantity || quantity < 1) setQuantity(1); }}
                className="text-2xl font-bold w-20 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
              />
              <button className="wz-stepper-btn" onClick={incrementQty}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Line total bar */}
        {!hidePricing && displayLineTotal != null && (
          <div className="wz-totals-bar flex items-center justify-between">
            <span className="text-sm text-secondary-foreground/70">Line Total</span>
            <span className="wz-totals-value">{formatCurrency(displayLineTotal)}</span>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (Optional)</Label>
          <Input
            placeholder="Add a note for this item..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-11 text-sm"
          />
        </div>

        {/* Submit */}
        <Button className="w-full h-12 text-sm" onClick={handleSubmit}>
          <Check className="h-4 w-4 mr-2" />
          {isEditing ? 'Update Item' : 'Add to PO'}
        </Button>
      </div>
    </div>
  );
}
