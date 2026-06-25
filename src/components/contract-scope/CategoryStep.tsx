import { Switch } from '@/components/ui/switch';
import type { ContractScopeCategory } from '@/types/contractScope';

interface CategoryStepProps {
  categories: ContractScopeCategory[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}

export function CategoryStep({ categories, selected, onToggle }: CategoryStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-heading">Select Scope Categories</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which categories are included in this contract.
        </p>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {categories.map(cat => (
          <div key={cat.slug} className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
            <span className="text-sm font-medium">{cat.label}</span>
            <Switch
              checked={selected.has(cat.slug)}
              onCheckedChange={() => onToggle(cat.slug)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
