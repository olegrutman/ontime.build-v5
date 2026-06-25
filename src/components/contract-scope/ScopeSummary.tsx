import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { CATEGORY_DETAILS } from '@/types/contractScope';
import type { ContractScopeCategory } from '@/types/contractScope';

interface ScopeSummaryProps {
  categories: ContractScopeCategory[];
  selectedSlugs: string[];
  details: Record<string, Record<string, string>>;
  exclusions: { label: string; isCustom: boolean }[];
}

export function ScopeSummary({ categories, selectedSlugs, details, exclusions }: ScopeSummaryProps) {
  const selectedCats = categories.filter(c => selectedSlugs.includes(c.slug));
  const excludedCats = categories.filter(c => !selectedSlugs.includes(c.slug));

  const formatDetail = (slug: string): string => {
    const catDetails = details[slug] || {};
    const fields = CATEGORY_DETAILS[slug] || [];
    const parts: string[] = [];

    for (const f of fields) {
      const val = catDetails[f.key];
      if (!val) continue;
      if (f.type === 'toggle') {
        if (val === 'true') parts.push(f.label);
      } else {
        parts.push(`${f.label}: ${val}`);
      }
    }

    return parts.length > 0 ? parts.join(' · ') : 'Included';
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-heading">Scope Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the complete scope for this contract.
        </p>
      </div>

      {/* Included */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Included</h3>
        <div className="rounded-lg border bg-card divide-y">
          {selectedCats.map(cat => (
            <div key={cat.slug} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">{formatDetail(cat.slug)}</p>
            </div>
          ))}
          {selectedCats.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No categories selected</div>
          )}
        </div>
      </div>

      {/* Not Included */}
      {excludedCats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Not Included</h3>
          <div className="flex flex-wrap gap-1.5">
            {excludedCats.map(c => (
              <Badge key={c.slug} variant="outline" className="text-muted-foreground">
                {c.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Exclusions */}
      {exclusions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Exclusions</h3>
          <div className="rounded-lg border bg-card divide-y">
            {exclusions.map(e => (
              <div key={e.label} className="flex items-center gap-2 px-4 py-2.5">
                <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="text-sm">{e.label}</span>
                {e.isCustom && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Custom</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
