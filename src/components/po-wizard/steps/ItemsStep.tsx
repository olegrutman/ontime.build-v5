import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, Plus, Minus, ShoppingCart, Trash2, Package, Loader2 } from 'lucide-react';
import { POWizardData, POWizardLineItem } from '@/types/poWizard';
import { CatalogSearchResult, CatalogCategory } from '@/types/supplier';
import { cn } from '@/lib/utils';

// Category chips for quick filtering
const CATEGORY_CHIPS: { label: string; value: CatalogCategory | null }[] = [
  { label: 'All', value: null },
  { label: 'Lumber', value: 'FramingLumber' },
  { label: 'Sheathing', value: 'Sheathing' },
  { label: 'Hardware', value: 'Hardware' },
  { label: 'Accessories', value: 'FramingAccessories' },
  { label: 'Decking', value: 'Decking' },
  { label: 'Engineered', value: 'Engineered' },
];

interface ItemsStepProps {
  data: POWizardData;
  onChange: (updates: Partial<POWizardData>) => void;
  supplierId: string | null;
}

export function ItemsStep({ data, onChange, supplierId }: ItemsStepProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string, categoryFilter: CatalogCategory | null) => {
    if (!supplierId) return;
    
    setLoading(true);

    const { data: searchResults, error } = await supabase.rpc('search_catalog_v2', {
      search_query: searchQuery || null,
      category_filter: categoryFilter || null,
      secondary_category_filter: null,
      manufacturer_filter: null,
      max_results: 30,
    });

    if (error) {
      console.error('Search error:', error);
      setResults([]);
    } else {
      // Cast and use results directly
      setResults((searchResults || []) as CatalogSearchResult[]);
    }
    setLoading(false);
  }, [supplierId]);

  // Debounce effect
  useEffect(() => {
    const shouldSearch = query.length >= 2 || category !== null;
    
    if (!shouldSearch) {
      if (query.length === 0 && category === null) {
        setResults([]);
      }
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query, category);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, performSearch]);

  // Get item quantity in cart
  const getCartQuantity = (sku: string): number => {
    const item = data.line_items.find(li => li.supplier_sku === sku);
    return item?.quantity || 0;
  };

  // Update quantity
  const updateQuantity = (item: CatalogSearchResult, delta: number) => {
    const existing = data.line_items.find(li => li.supplier_sku === item.supplier_sku);
    const newQty = (existing?.quantity || 0) + delta;

    if (newQty <= 0) {
      // Remove item
      onChange({
        line_items: data.line_items.filter(li => li.supplier_sku !== item.supplier_sku),
      });
    } else if (existing) {
      // Update existing
      onChange({
        line_items: data.line_items.map(li =>
          li.supplier_sku === item.supplier_sku
            ? { ...li, quantity: newQty }
            : li
        ),
      });
    } else {
      // Add new
      const newItem: POWizardLineItem = {
        catalog_item_id: item.id,
        supplier_sku: item.supplier_sku,
        description: item.name || item.description,
        quantity: newQty,
        uom: item.uom_default,
      };
      onChange({
        line_items: [...data.line_items, newItem],
      });
    }
  };

  const removeFromCart = (sku: string) => {
    onChange({
      line_items: data.line_items.filter(li => li.supplier_sku !== sku),
    });
  };

  const totalItems = data.line_items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Add Items</h2>
          <p className="text-muted-foreground text-sm">
            Tap category or search for materials
          </p>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_CHIPS.map((chip) => (
          <Badge
            key={chip.label}
            variant={category === chip.value ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1.5 text-sm touch-manipulation"
            onClick={() => setCategory(chip.value)}
          >
            {chip.label}
          </Badge>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search SKU, name, dimensions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          type="text"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {results.map((item) => {
            const cartQty = getCartQuantity(item.supplier_sku);
            
            return (
              <Card key={item.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {item.supplier_sku}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {item.uom_default}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">
                      {item.name || item.description}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 touch-manipulation"
                      onClick={() => updateQuantity(item, -1)}
                      disabled={cartQty === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-mono text-lg">
                      {cartQty}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 touch-manipulation"
                      onClick={() => updateQuantity(item, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty States */}
      {!loading && results.length === 0 && (query.length >= 2 || category) && (
        <Card className="p-6 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No items found</p>
          <p className="text-sm">Try different search terms</p>
        </Card>
      )}

      {!loading && results.length === 0 && !query && !category && (
        <Card className="p-6 text-center text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Search or tap a category</p>
        </Card>
      )}

      {/* Cart Summary - Fixed at bottom */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild>
          <Card 
            className={cn(
              'p-4 cursor-pointer transition-all touch-manipulation',
              'hover:border-primary/50',
              data.line_items.length > 0 && 'border-primary bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">
                  Cart: {data.line_items.length} item{data.line_items.length !== 1 ? 's' : ''}
                  {totalItems > 0 && ` (${totalItems} units)`}
                </span>
              </div>
              <span className="text-primary text-sm">View →</span>
            </div>
          </Card>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Items in Order</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(60vh-100px)]">
            {data.line_items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No items in cart</p>
              </div>
            ) : (
              data.line_items.map((item) => (
                <Card key={item.supplier_sku} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {item.supplier_sku}
                      </code>
                      <p className="font-medium text-sm mt-1 truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono">
                        {item.quantity} {item.uom}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.supplier_sku)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
