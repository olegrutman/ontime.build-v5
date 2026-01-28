import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { INVENTORY_PRESETS, InventoryFilters } from '@/types/inventory';

interface InventoryPresetsProps {
  activePresetId?: string;
  onPresetSelect: (filters: Partial<InventoryFilters>) => void;
}

export function InventoryPresets({ activePresetId, onPresetSelect }: InventoryPresetsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {INVENTORY_PRESETS.map((preset) => (
          <Badge
            key={preset.id}
            variant={activePresetId === preset.id ? 'default' : 'outline'}
            className="cursor-pointer py-2 px-4 text-sm shrink-0"
            onClick={() => onPresetSelect(preset.filters)}
          >
            {preset.label}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
