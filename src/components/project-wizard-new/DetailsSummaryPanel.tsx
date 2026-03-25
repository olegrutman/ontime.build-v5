import { Badge } from '@/components/ui/badge';
import { Building2, Layers, Home, Fence, Sparkles } from 'lucide-react';
import type { ProfileDraft } from '@/types/projectProfile';

interface DetailsSummaryPanelProps {
  draft: ProfileDraft;
  typeName?: string;
}

export function DetailsSummaryPanel({ draft, typeName }: DetailsSummaryPanelProps) {
  const hasType = !!draft.project_type_id;
  const hasStructure = draft.foundation_types.length > 0 || !!draft.roof_type;
  const elements = [
    draft.has_garage && 'Garage',
    draft.has_basement && 'Basement',
    draft.has_stairs && 'Stairs',
  ].filter(Boolean) as string[];
  const features = [
    draft.has_deck_balcony && 'Deck / Balcony',
    draft.has_pool && 'Pool / Spa',
    draft.has_elevator && 'Elevator',
    draft.has_clubhouse && 'Clubhouse',
    draft.has_commercial_spaces && 'Commercial',
    draft.has_shed && 'Shed',
  ].filter(Boolean) as string[];

  if (!hasType) return null;

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Profile Summary
      </p>

      {typeName && (
        <div className="flex items-start gap-2">
          <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{typeName}</p>
            <p className="text-xs text-muted-foreground">
              {draft.stories} {draft.stories === 1 ? 'story' : 'stories'}
              {draft.units_per_building ? ` · ${draft.units_per_building} units` : ''}
              {draft.number_of_buildings > 1 ? ` · ${draft.number_of_buildings} bldgs` : ''}
            </p>
          </div>
        </div>
      )}

      {hasStructure && (
        <div className="flex items-start gap-2">
          <Layers className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-1">
            {draft.foundation_types.map(f => (
              <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
            ))}
            {draft.roof_type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{draft.roof_type}</Badge>
            )}
          </div>
        </div>
      )}

      {elements.length > 0 && (
        <div className="flex items-start gap-2">
          <Home className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{elements.join(', ')}</p>
        </div>
      )}

      {features.length > 0 && (
        <div className="flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{features.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
