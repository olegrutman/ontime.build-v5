import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InventoryFilterDrawer,
  InventoryProductRow,
  InventoryProductDetail,
  InventoryEmptyState,
  InventoryPresets,
} from '@/components/inventory';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';
import { InventoryItem, INVENTORY_PRESETS } from '@/types/inventory';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    items,
    isLoading,
    filters,
    filterHistory,
    hasActiveFilters,
    availableAttributes,
    setSearch,
    setMainCategory,
    setSecondaryCategory,
    toggleAttribute,
    setQtyType,
    clearLastFilter,
    clearAllFilters,
    widenFilters,
    applyPreset,
  } = useInventory();

  const { draftOrder, addToOrder, isAddingItem } = useInventoryOrder();

  // Determine active preset
  const activePresetId = useMemo(() => {
    const preset = INVENTORY_PRESETS.find(
      p => p.filters.mainCategory === filters.mainCategory && 
           !filters.secondaryCategory && 
           filters.attributes.length === 0
    );
    return preset?.id;
  }, [filters]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.mainCategory) count++;
    if (filters.secondaryCategory) count++;
    count += filters.attributes.length;
    if (filters.qtyType) count++;
    return count;
  }, [filters]);

  const handleProductClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleAddToOrder = (item: InventoryItem, qty: number, notes?: string) => {
    // For now, we need a work item context - this will be enhanced
    addToOrder(item, qty);
  };

  const draftLineCount = draftOrder?.lines.length || 0;

  return (
    <AppLayout 
      title="Inventory" 
      subtitle="Search and order materials"
    >
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Sticky Header with Search */}
        <div className="sticky top-0 z-10 bg-background border-b p-3 space-y-3">
          {/* Search Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, name, or attribute..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
                autoComplete="off"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className={cn('h-11 w-11 shrink-0', hasActiveFilters && 'border-primary')}
              onClick={() => setFilterDrawerOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Presets Row */}
          <InventoryPresets 
            activePresetId={activePresetId}
            onPresetSelect={applyPreset}
          />
        </div>

        {/* Results Area */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-3 p-4 border-b">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <InventoryEmptyState
                searchTerm={filters.search}
                hasFilters={hasActiveFilters}
                filterHistoryLength={filterHistory.length}
                onClearLastFilter={clearLastFilter}
                onClearAllFilters={clearAllFilters}
                onWidenFilters={widenFilters}
              />
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="px-4 py-2 text-sm text-muted-foreground border-b bg-muted/30">
                {items.length} item{items.length !== 1 ? 's' : ''}
                {filters.search && ` for "${filters.search}"`}
              </div>
              
              {/* Product List */}
              <div>
                {items.map((item) => (
                  <InventoryProductRow
                    key={item.id}
                    item={item}
                    onClick={() => handleProductClick(item)}
                  />
                ))}
              </div>
            </>
          )}
        </ScrollArea>

        {/* Floating Order Cart Button (when items in draft) */}
        {draftLineCount > 0 && (
          <div className="sticky bottom-4 px-4 pb-4">
            <Button 
              className="w-full h-12 gap-2 shadow-lg"
              onClick={() => {
                // Navigate to order page
              }}
            >
              <ShoppingCart className="h-5 w-5" />
              View Order ({draftLineCount} items)
            </Button>
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <InventoryFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        filters={filters}
        availableAttributes={availableAttributes}
        onMainCategoryChange={setMainCategory}
        onSecondaryCategoryChange={setSecondaryCategory}
        onAttributeToggle={toggleAttribute}
        onQtyTypeChange={setQtyType}
        onClearAll={clearAllFilters}
      />

      {/* Product Detail Sheet */}
      <InventoryProductDetail
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAddToOrder={handleAddToOrder}
        isAdding={isAddingItem}
      />
    </AppLayout>
  );
}
