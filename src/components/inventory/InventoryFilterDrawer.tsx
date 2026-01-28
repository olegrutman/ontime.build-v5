import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CATALOG_CATEGORIES, CATEGORY_LABELS, CatalogCategory } from '@/types/supplier';
import { SECONDARY_CATEGORIES, COMMON_QTY_TYPES } from '@/types/inventory';
import { InventoryFilters } from '@/types/inventory';

interface InventoryFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InventoryFilters;
  availableAttributes: string[];
  onMainCategoryChange: (category: CatalogCategory | null) => void;
  onSecondaryCategoryChange: (category: string | null) => void;
  onAttributeToggle: (attr: string) => void;
  onQtyTypeChange: (qtyType: string | null) => void;
  onClearAll: () => void;
}

export function InventoryFilterDrawer({
  open,
  onOpenChange,
  filters,
  availableAttributes,
  onMainCategoryChange,
  onSecondaryCategoryChange,
  onAttributeToggle,
  onQtyTypeChange,
  onClearAll,
}: InventoryFilterDrawerProps) {
  const secondaryOptions = filters.mainCategory 
    ? SECONDARY_CATEGORIES[filters.mainCategory] || []
    : [];

  const hasFilters = filters.mainCategory || filters.secondaryCategory || 
    filters.attributes.length > 0 || filters.qtyType;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-3">
          <DrawerTitle>Filters</DrawerTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={onClearAll}>
                Clear All
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6">
          <div className="space-y-6 py-4">
            {/* Main Category */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Category</h4>
              <div className="flex flex-wrap gap-2">
                {CATALOG_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={filters.mainCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer py-2 px-3 text-sm"
                    onClick={() => onMainCategoryChange(filters.mainCategory === cat ? null : cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Secondary Category (conditional) */}
            {secondaryOptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Sub-Category</h4>
                <div className="flex flex-wrap gap-2">
                  {secondaryOptions.map((subCat) => (
                    <Badge
                      key={subCat}
                      variant={filters.secondaryCategory === subCat ? 'default' : 'outline'}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => onSecondaryCategoryChange(
                        filters.secondaryCategory === subCat ? null : subCat
                      )}
                    >
                      {subCat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Attribute Chips */}
            {availableAttributes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Size / Length</h4>
                <div className="flex flex-wrap gap-2">
                  {availableAttributes.map((attr) => (
                    <Badge
                      key={attr}
                      variant={filters.attributes.includes(attr) ? 'default' : 'outline'}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => onAttributeToggle(attr)}
                    >
                      {attr}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Qty Type */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Unit of Measure</h4>
              <div className="flex flex-wrap gap-2">
                {COMMON_QTY_TYPES.map((qt) => (
                  <Badge
                    key={qt}
                    variant={filters.qtyType === qt ? 'default' : 'outline'}
                    className="cursor-pointer py-2 px-3 text-sm"
                    onClick={() => onQtyTypeChange(filters.qtyType === qt ? null : qt)}
                  >
                    {qt}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
