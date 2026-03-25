import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_DETAILS } from '@/types/contractScope';
import type { ContractScopeCategory } from '@/types/contractScope';

interface DetailStepProps {
  categories: ContractScopeCategory[];
  selectedSlugs: string[];
  details: Record<string, Record<string, string>>;
  onDetailChange: (slug: string, key: string, value: string) => void;
}

export function DetailStep({ categories, selectedSlugs, details, onDetailChange }: DetailStepProps) {
  const activeCats = categories.filter(c => selectedSlugs.includes(c.slug) && CATEGORY_DETAILS[c.slug]);

  if (activeCats.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-heading">Detailed Scope</h2>
        <p className="text-sm text-muted-foreground">No categories with configurable details selected. You can proceed to the next step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-heading">Detailed Scope</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure specifics for each scope category.
        </p>
      </div>

      <div className="space-y-3">
        {activeCats.map(cat => {
          const fields = CATEGORY_DETAILS[cat.slug] || [];
          const catDetails = details[cat.slug] || {};

          return (
            <Collapsible key={cat.slug} defaultOpen>
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left">
                  <span className="text-sm font-semibold">{cat.label}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y border-t">
                    {fields.map(field => {
                      // Check showWhen condition
                      if (field.showWhen && !field.showWhen(catDetails)) return null;

                      if (field.type === 'toggle') {
                        return (
                          <div key={field.key} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
                            <span className="text-sm">{field.label}</span>
                            <Switch
                              checked={catDetails[field.key] === 'true'}
                              onCheckedChange={v => onDetailChange(cat.slug, field.key, v ? 'true' : 'false')}
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="flex items-center justify-between px-4 py-3 min-h-[48px] gap-4">
                          <span className="text-sm shrink-0">{field.label}</span>
                          <Select
                            value={catDetails[field.key] || ''}
                            onValueChange={v => onDetailChange(cat.slug, field.key, v)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
