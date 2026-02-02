import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { SecondaryCount } from '@/types/poWizardV2';

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
          <Skeleton key={i} className="h-14 w-full" />
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
    <div className="p-4 space-y-2">
      {categories.map(category => (
        <button
          key={category.secondary_category}
          onClick={() => onSelect(category.secondary_category)}
          className="flex items-center justify-between w-full p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors active:scale-[0.99]"
        >
          <span className="font-medium">{category.secondary_category}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {category.count}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  );
}
