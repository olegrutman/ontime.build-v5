import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, Check, Trash2, AlertTriangle } from 'lucide-react';
import { POWizardV2LineItem } from '@/types/poWizardV2';

interface UnmatchedItemPanelProps {
  item: POWizardV2LineItem;
  onUpdate: (item: POWizardV2LineItem) => void;
  onRemove: (itemId: string) => void;
  onBack: () => void;
}

export function UnmatchedItemPanel({
  item,
  onUpdate,
  onRemove,
  onBack,
}: UnmatchedItemPanelProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [notes, setNotes] = useState(item.item_notes || '');

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleSave = () => {
    onUpdate({
      ...item,
      quantity,
      item_notes: notes || undefined,
    });
  };

  const handleDelete = () => {
    onRemove(item.id);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Warning banner */}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This item is not matched to the catalog. You can adjust the quantity or remove it.
        </p>
      </div>

      {/* Item info */}
      <div>
        <h3 className="font-semibold text-sm">{item.name}</h3>
        {item.specs && (
          <p className="text-xs text-muted-foreground mt-1">{item.specs}</p>
        )}
      </div>

      {/* Quantity stepper */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Quantity</Label>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={decrement}
            disabled={quantity <= 1}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
            onBlur={() => { if (!quantity || quantity < 1) setQuantity(1); }}
            className="text-3xl font-bold w-24 text-center h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={1}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={increment}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {item.uom}
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Notes (Optional)</Label>
        <Input
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Button className="w-full h-12" onClick={handleSave}>
          <Check className="h-5 w-5 mr-2" />
          Update Item
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Remove from PO
        </Button>
      </div>
    </div>
  );
}
