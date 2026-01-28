import { Package, Undo2, RefreshCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface InventoryEmptyStateProps {
  searchTerm: string;
  hasFilters: boolean;
  filterHistoryLength: number;
  onClearLastFilter: () => void;
  onClearAllFilters: () => void;
  onWidenFilters: () => void;
  suggestedItems?: { description: string; sku: string }[];
  onSuggestedClick?: (sku: string) => void;
}

export function InventoryEmptyState({
  searchTerm,
  hasFilters,
  filterHistoryLength,
  onClearLastFilter,
  onClearAllFilters,
  onWidenFilters,
  suggestedItems = [],
  onSuggestedClick,
}: InventoryEmptyStateProps) {
  return (
    <Card className="p-6 text-center">
      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      
      <h3 className="font-semibold mb-1">No results found</h3>
      <p className="text-sm text-muted-foreground mb-4">
        0 items match your current filters
        {searchTerm && ` for "${searchTerm}"`}
      </p>

      {/* Recovery Actions */}
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        {filterHistoryLength > 0 && (
          <Button 
            variant="outline" 
            onClick={onClearLastFilter}
            className="w-full gap-2 h-11"
          >
            <Undo2 className="h-4 w-4" />
            Clear Last Filter
          </Button>
        )}
        
        {hasFilters && (
          <>
            <Button 
              variant="outline" 
              onClick={onWidenFilters}
              className="w-full gap-2 h-11"
            >
              <Maximize2 className="h-4 w-4" />
              Widen Filters
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={onClearAllFilters}
              className="w-full gap-2 h-11"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear All Filters
            </Button>
          </>
        )}
      </div>

      {/* Suggested Matches */}
      {suggestedItems.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Suggested matches</h4>
          <div className="space-y-2">
            {suggestedItems.slice(0, 5).map((item, i) => (
              <button
                key={i}
                onClick={() => onSuggestedClick?.(item.sku)}
                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
