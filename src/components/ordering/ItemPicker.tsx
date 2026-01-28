import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Package, Ruler, Hammer, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { CATALOG_CATEGORIES, CatalogCategory, CATEGORY_LABELS } from '@/types/supplier';
import { LumberCalculator } from './LumberCalculator';
import { OrderItem } from '@/types/materialOrder';

interface CatalogSearchResult {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  category: CatalogCategory;
  description: string;
  uom_default: string;
  size_or_spec?: string;
  search_keywords?: string[];
  rank: number;
}

interface ItemPickerProps {
  onAddItem: (item: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

export function ItemPicker({ onAddItem, onClose }: ItemPickerProps) {
  const [step, setStep] = useState<'category' | 'search' | 'configure'>('category');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Configuration state
  const [quantity, setQuantity] = useState(1);
  const [lumberData, setLumberData] = useState<{
    pieces: number;
    lengthFt: number;
    widthIn?: number;
    thicknessIn?: number;
    computedBf?: number;
    computedLf?: number;
    quantity: number;
    uom: string;
  } | null>(null);

  const categoryIcons: Record<CatalogCategory, React.ReactNode> = {
    Adhesives: <Package className="h-5 w-5" />,
    Concrete: <Package className="h-5 w-5" />,
    Decking: <Layers className="h-5 w-5" />,
    Dimensional: <Ruler className="h-5 w-5" />,
    Engineered: <Layers className="h-5 w-5" />,
    Exterior: <Package className="h-5 w-5" />,
    Fasteners: <Package className="h-5 w-5" />,
    Hardware: <Hammer className="h-5 w-5" />,
    Insulation: <Package className="h-5 w-5" />,
    Interior: <Package className="h-5 w-5" />,
    Other: <Package className="h-5 w-5" />,
    Roofing: <Package className="h-5 w-5" />,
    Sheathing: <Package className="h-5 w-5" />,
    Structural: <Layers className="h-5 w-5" />,
  };

  const handleCategorySelect = (category: CatalogCategory) => {
    setSelectedCategory(category);
    setStep('search');
    // Auto-search for non-hardware categories
    if (category !== 'Hardware') {
      handleSearch(category);
    }
  };

  const handleSearch = async (category?: CatalogCategory) => {
    const cat = category || selectedCategory;
    if (!cat && !searchQuery.trim()) return;

    setSearching(true);
    const { data, error } = await supabase.rpc('search_catalog', {
      search_query: searchQuery.trim() || '',
      category_filter: cat || null,
      supplier_filter: null,
    });

    if (error) {
      toast.error('Search failed: ' + error.message);
      setSearching(false);
      return;
    }

    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSelectItem = (item: CatalogSearchResult) => {
    setSelectedItem(item);
    setStep('configure');
  };

  const handleLumberChange = useCallback((data: typeof lumberData) => {
    setLumberData(data);
  }, []);

  const handleAddToOrder = () => {
    if (!selectedItem) return;

    const isLumber = selectedCategory === 'Dimensional' || selectedCategory === 'Engineered';
    
    const orderItem: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'> = {
      catalog_item_id: selectedItem.id,
      supplier_sku: selectedItem.supplier_sku,
      description: selectedItem.description,
      category: selectedItem.category,
      quantity: isLumber && lumberData ? lumberData.quantity : quantity,
      uom: isLumber && lumberData ? lumberData.uom : selectedItem.uom_default,
      pieces: lumberData?.pieces,
      length_ft: lumberData?.lengthFt,
      width_in: lumberData?.widthIn,
      thickness_in: lumberData?.thicknessIn,
      computed_bf: lumberData?.computedBf,
      computed_lf: lumberData?.computedLf,
      from_pack: false,
    };

    onAddItem(orderItem);
    toast.success('Item added to order');
    
    // Reset for next item
    setSelectedItem(null);
    setQuantity(1);
    setLumberData(null);
    setStep('category');
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Category Selection */}
      {step === 'category' && (
        <div>
          <h3 className="font-semibold mb-4">Select Item Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATALOG_CATEGORIES.map(cat => (
              <Card
                key={cat}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCategorySelect(cat)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                    {categoryIcons[cat]}
                  </div>
                  <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  {cat === 'Hardware' && (
                    <span className="text-xs text-muted-foreground mt-1">Search required</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Search & Select */}
      {step === 'search' && selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('category')}>
              ← Back
            </Button>
            <Badge>{CATEGORY_LABELS[selectedCategory]}</Badge>
          </div>

          {/* Search input - required for Hardware */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  selectedCategory === 'Hardware'
                    ? 'Search hardware items...'
                    : 'Search or browse items...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                autoFocus={selectedCategory === 'Hardware'}
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {selectedCategory === 'Hardware' && searchResults.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Enter a search term to find hardware items (e.g., "joist hanger", "LUS26")
            </p>
          )}

          {/* Results table */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Size/Spec</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.supplier_sku}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.size_or_spec || '-'}</TableCell>
                      <TableCell>{item.uom_default}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleSelectItem(item)}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Configure Quantity */}
      {step === 'configure' && selectedItem && selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
              ← Back
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{selectedItem.description}</CardTitle>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{selectedItem.supplier_sku}</Badge>
                <Badge variant="secondary">{CATEGORY_LABELS[selectedCategory]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lumber calculator for Dimensional/Engineered */}
              {(selectedCategory === 'Dimensional' || selectedCategory === 'Engineered') ? (
                <LumberCalculator 
                  category={selectedCategory} 
                  onChange={handleLumberChange}
                />
              ) : (
                /* Simple quantity input for other categories */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={selectedItem.uom_default} disabled />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleAddToOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
