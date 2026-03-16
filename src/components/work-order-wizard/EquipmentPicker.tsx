import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronRight } from 'lucide-react';
import { EQUIPMENT_CATALOG, type EquipmentCatalogItem } from '@/types/workOrderWizard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface EquipmentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: EquipmentCatalogItem) => void;
}

export function EquipmentPicker({ open, onOpenChange, onSelect }: EquipmentPickerProps) {
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const map = new Map<string, EquipmentCatalogItem[]>();
    for (const item of EQUIPMENT_CATALOG) {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) continue;
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [search]);

  const handleSelect = (item: EquipmentCatalogItem) => {
    onSelect(item);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Pick Equipment</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[50vh] space-y-4">
            {Array.from(categories.entries()).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  {category}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-sm">{item.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {categories.size === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No equipment found</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
