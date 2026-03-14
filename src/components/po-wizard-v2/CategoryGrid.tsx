import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { CategoryCount } from '@/types/poWizardV2';

interface CategoryGridProps {
  categories: CategoryCount[];
  loading: boolean;
  onSelect: (category: string) => void;
}

export function CategoryGrid({ categories, loading, onSelect }: CategoryGridProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground">No products available from this supplier.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto min-h-0 p-4 space-y-2">
      {categories.map(category => (
        <button
          key={category.category}
          onClick={() => onSelect(category.category)}
          className="wz-ans"
        >
          <span className="text-2xl">{category.icon}</span>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-sm">{category.displayName}</p>
            <p className="text-xs text-muted-foreground">{category.count} items</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
