import { Package, ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LineItem {
  id: string;
  pack_name: string;
  description: string;
  quantity: number | null;
  uom: string | null;
  status: string;
  catalog_item_id: string | null;
}

interface PackSummary {
  pack_name: string;
  total_items: number;
  matched_items: number;
  items: LineItem[];
}

interface EstimatePackListProps {
  items: LineItem[];
  onCreatePO: (packName: string, packItems: LineItem[]) => void;
  disabled?: boolean;
}

export function EstimatePackList({ items, onCreatePO, disabled = false }: EstimatePackListProps) {
  // Group items by pack
  const packMap = new Map<string, LineItem[]>();
  items.forEach(item => {
    const existing = packMap.get(item.pack_name) || [];
    existing.push(item);
    packMap.set(item.pack_name, existing);
  });

  const packs: PackSummary[] = Array.from(packMap.entries()).map(([pack_name, packItems]) => ({
    pack_name,
    total_items: packItems.length,
    matched_items: packItems.filter(i => i.catalog_item_id).length,
    items: packItems,
  }));

  // Sort packs: matched first, then by name
  packs.sort((a, b) => {
    const aReady = a.matched_items === a.total_items;
    const bReady = b.matched_items === b.total_items;
    if (aReady !== bReady) return bReady ? 1 : -1;
    return a.pack_name.localeCompare(b.pack_name);
  });

  if (packs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No packs available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Packs</h3>
      <div className="grid gap-3">
        {packs.map((pack) => {
          const isReady = pack.matched_items === pack.total_items;
          const hasMatchedItems = pack.matched_items > 0;
          
          return (
            <Card
              key={pack.pack_name}
              className={isReady ? 'border-green-200 dark:border-green-900' : ''}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isReady ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'}`}>
                    <Package className={`h-4 w-4 ${isReady ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{pack.pack_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{pack.total_items} items</span>
                      <span>•</span>
                      {isReady ? (
                        <Badge variant="outline" className="h-5 gap-1 text-green-600 border-green-200">
                          <Check className="h-3 w-3" />
                          All matched
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 gap-1 text-yellow-600 border-yellow-200">
                          <AlertCircle className="h-3 w-3" />
                          {pack.matched_items}/{pack.total_items} matched
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isReady ? 'default' : 'outline'}
                  onClick={() => onCreatePO(pack.pack_name, pack.items)}
                  disabled={disabled || !hasMatchedItems}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create PO
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
