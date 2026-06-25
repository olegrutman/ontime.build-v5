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
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground">No subcategories available.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto min-h-0 p-4 space-y-2">
      {categories.map(category => {
        const displayName = SECONDARY_DISPLAY_NAMES[category.secondary_category] || category.secondary_category;
        return (
          <button
            key={category.secondary_category}
            onClick={() => onSelect(category.secondary_category)}
            className="wz-ans"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-sm">{displayName}</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
              {category.count}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
