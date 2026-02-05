import { Button } from '@/components/ui/button';
import { Package, ShoppingCart } from 'lucide-react';

export type OrderingMode = 'estimate' | 'catalog';

interface OrderingModeToggleProps {
  mode: OrderingMode;
  onChange: (mode: OrderingMode) => void;
  hasEstimate: boolean;
}

export function OrderingModeToggle({ mode, onChange, hasEstimate }: OrderingModeToggleProps) {
  if (!hasEstimate) return null;

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant={mode === 'estimate' ? 'default' : 'ghost'}
        size="sm"
        className="flex-1 h-9 text-xs"
        onClick={() => onChange('estimate')}
      >
        <Package className="h-3.5 w-3.5 mr-1.5" />
        Project Estimate
      </Button>
      <Button
        variant={mode === 'catalog' ? 'default' : 'ghost'}
        size="sm"
        className="flex-1 h-9 text-xs"
        onClick={() => onChange('catalog')}
      >
        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
        Full Catalog
      </Button>
    </div>
  );
}
