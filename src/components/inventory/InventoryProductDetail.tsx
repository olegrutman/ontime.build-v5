import { useState } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { InventoryItem } from '@/types/inventory';
import { CATEGORY_LABELS } from '@/types/supplier';

interface InventoryProductDetailProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToOrder: (item: InventoryItem, qty: number, notes?: string) => void;
  isAdding?: boolean;
}

export function InventoryProductDetail({
  item,
  open,
  onOpenChange,
  onAddToOrder,
  isAdding = false,
}: InventoryProductDetailProps) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!item) return;
    onAddToOrder(item, qty, notes);
    // Reset for next item
    setQty(1);
    setNotes('');
    onOpenChange(false);
  };

  const incrementQty = () => setQty(prev => prev + 1);
  const decrementQty = () => setQty(prev => Math.max(1, prev - 1));

  if (!item) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg leading-tight">
            {item.description}
          </DrawerTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="font-mono text-xs">
              {item.supplier_sku}
            </Badge>
            <Badge variant="secondary">
              {CATEGORY_LABELS[item.category]}
            </Badge>
            <Badge>{item.uom_default}</Badge>
          </div>
        </DrawerHeader>

        <div className="px-4 py-3 space-y-4">
          {/* Size/Spec */}
          {item.size_or_spec && (
            <div>
              <Label className="text-xs text-muted-foreground">Size / Spec</Label>
              <p className="text-sm font-medium">{item.size_or_spec}</p>
            </div>
          )}

          {/* Keywords */}
          {item.search_keywords && item.search_keywords.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Attributes</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.search_keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={decrementQty}
                disabled={qty <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-lg font-semibold h-11"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={incrementQty}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {item.uom_default}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Line Notes (optional)</Label>
            <Textarea
              placeholder="Add notes for this line item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </DrawerClose>
          <Button 
            onClick={handleAdd} 
            disabled={isAdding}
            className="flex-1 gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Order
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
