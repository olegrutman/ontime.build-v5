import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCount } from '@/types/poWizardV2';

interface CategoryGridProps {
  categories: CategoryCount[];
  loading: boolean;
  onSelect: (category: string) => void;
}

export function CategoryGrid({ categories, loading, onSelect }: CategoryGridProps) {
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 p-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-muted-foreground">No products available from this supplier.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 p-4">
        {categories.map(category => (
          <button
            key={category.category}
            onClick={() => onSelect(category.category)}
            className="flex flex-col items-center justify-center p-4 h-24 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-center active:scale-[0.98]"
          >
            <span className="text-2xl mb-1">{category.icon}</span>
            <span className="font-medium text-sm leading-tight">{category.displayName}</span>
            <span className="text-xs text-muted-foreground">{category.count} items</span>
          </button>
        ))}
      </div>
    </div>
  );
}
