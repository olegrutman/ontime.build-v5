import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Minus, Plus, Check, ChevronRight } from 'lucide-react';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  supplier_sku: string | null;
  catalog_item_id: string | null;
  pack_name: string | null;
}

interface PSMUnmatchedListProps {
  items: EstimateItem[];
  onAddItem: (item: EstimateItem, quantity: number) => void;
}

export function PSMUnmatchedList({ items, onAddItem }: PSMUnmatchedListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleExpand = (item: EstimateItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      setQuantity(item.quantity);
    }
  };

  const handleAdd = (item: EstimateItem) => {
    onAddItem(item, quantity);
    setExpandedId(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <p className="text-sm text-muted-foreground">No unmatched items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">
          These items are not matched to the catalog. Tap to add them to your PO with an adjusted quantity.
        </p>
      </div>

      {items.map((item) => (
        <Card
          key={item.id}
          className={expandedId === item.id ? 'border-primary/50' : 'cursor-pointer hover:bg-accent transition-colors'}
        >
          <CardContent className="p-0">
            {/* Item row */}
            <div
              className="flex items-center justify-between gap-3 p-3 cursor-pointer"
              onClick={() => handleExpand(item)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.quantity} {item.uom}
                  </Badge>
                  {item.supplier_sku && (
                    <span className="text-xs text-muted-foreground truncate">
                      SKU: {item.supplier_sku}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`} />
            </div>

            {/* Expanded quantity picker */}
            {expandedId === item.id && (
              <div className="border-t p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setQuantity(q => Math.max(1, q - 1)); }}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center h-10 text-lg font-bold"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setQuantity(q => q + 1); }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">{item.uom}</p>
                </div>
                <Button
                  className="w-full h-10"
                  onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Add to PO
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
