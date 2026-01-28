import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryProductRowProps {
  item: InventoryItem;
  onClick: () => void;
}

export function InventoryProductRow({ item, onClick }: InventoryProductRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 border-b border-border',
        'min-h-[60px] cursor-pointer',
        'active:bg-muted/50 hover:bg-muted/30 transition-colors',
        'touch-manipulation' // Better touch handling
      )}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Primary: Name/Description */}
        <p className="font-medium text-sm leading-tight line-clamp-2">
          {item.description}
        </p>
        
        {/* Secondary: Key differentiator (size/spec) */}
        {item.size_or_spec && (
          <p className="text-sm text-muted-foreground">
            {item.size_or_spec}
          </p>
        )}
        
        {/* SKU */}
        <p className="text-xs text-muted-foreground font-mono">
          {item.supplier_sku}
        </p>
      </div>

      {/* Right side: UOM badge */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Badge variant="secondary" className="text-xs">
          {item.uom_default}
        </Badge>
        {item.rank !== undefined && item.rank > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {Math.round(item.rank * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
