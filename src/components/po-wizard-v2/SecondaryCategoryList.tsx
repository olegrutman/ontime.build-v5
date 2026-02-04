import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { SecondaryCount, SECONDARY_DISPLAY_NAMES } from '@/types/poWizardV2';

interface SecondaryCategoryListProps {
  categories: SecondaryCount[];
  loading: boolean;
  onSelect: (secondary: string) => void;
}

export function SecondaryCategoryList({ categories, loading, onSelect }: SecondaryCategoryListProps) {
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-muted-foreground">No subcategories available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-2">
        {categories.map(category => {
          const displayName = SECONDARY_DISPLAY_NAMES[category.secondary_category] || category.secondary_category;
          
          return (
            <button
              key={category.secondary_category}
              onClick={() => onSelect(category.secondary_category)}
              className="flex items-center justify-between w-full p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors active:scale-[0.99]"
            >
              <span className="font-medium">{displayName}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {category.count}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
