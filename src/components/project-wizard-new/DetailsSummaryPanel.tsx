import { Badge } from '@/components/ui/badge';
import { Building2, Layers, Home, Sparkles, Hammer, ClipboardList } from 'lucide-react';
import type { ProfileDraft } from '@/types/projectProfile';

interface DetailsSummaryPanelProps {
  draft: ProfileDraft;
  typeName?: string;
}

export function DetailsSummaryPanel({ draft, typeName }: DetailsSummaryPanelProps) {
  const hasType = !!draft.project_type_id;

  const structureBadges: string[] = [];
  if (draft.framing_system) structureBadges.push(draft.framing_system);
  if (draft.floor_system) structureBadges.push(draft.floor_system);
  if (draft.roof_system) structureBadges.push(draft.roof_system);
  if (draft.structure_type) structureBadges.push(draft.structure_type);
  draft.foundation_types.forEach(f => structureBadges.push(f));

  const elements = [
    draft.has_garage && `Garage${draft.garage_car_count ? ` (${draft.garage_car_count}-car)` : ''}`,
    draft.has_basement && `Basement${draft.basement_type ? ` (${draft.basement_type})` : ''}`,
    draft.has_stairs && 'Stairs',
    draft.has_corridors && draft.corridor_type && `${draft.corridor_type} Corridors`,
  ].filter(Boolean) as string[];

  const features = [
    draft.has_balcony && 'Balcony',
    draft.deck_porch_type && draft.deck_porch_type !== 'None' && draft.deck_porch_type,
    draft.has_elevator && 'Elevator',
    draft.has_pool && 'Pool / Spa',
    draft.has_clubhouse && 'Clubhouse',
    draft.has_commercial_spaces && 'Commercial',
    draft.has_shed && 'Shed',
  ].filter(Boolean) as string[];

  if (draft.special_rooms?.length > 0) {
    features.push(...draft.special_rooms);
  }

  // Scope summary items
  const scopeItems = [
    draft.scope_windows_install && 'Windows',
    draft.scope_patio_doors && 'Patio Doors',
    draft.scope_siding && `Siding${draft.scope_siding_type ? ` (${draft.scope_siding_type})` : ''}`,
    draft.scope_exterior_trim && 'Ext. Trim',
    draft.scope_soffit_fascia && 'Soffit/Fascia',
    draft.scope_wrb && 'WRB',
    draft.scope_sheathing && 'Sheathing',
    draft.scope_backout && 'Backout',
    draft.scope_decks_railings && 'Decks',
    draft.scope_garage_framing && 'Garage Framing',
    draft.scope_backout_blocking && 'Blocking',
    draft.scope_fire_stopping && 'Fire Stopping',
    draft.scope_stairs_scope && 'Stairs Scope',
    draft.scope_curtain_wall && 'Curtain Wall',
    draft.scope_storefront_framing && 'Storefront',
    ...draft.scope_extras,
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
              {draft.stories_per_unit ? ` · ${draft.stories_per_unit} stories/unit` : ''}
            </p>
          </div>
        </div>
      )}

      {structureBadges.length > 0 && (
        <div className="flex items-start gap-2">
          <Hammer className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-1">
            {structureBadges.map(b => (
              <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0">{b}</Badge>
            ))}
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

      {draft.entry_type && draft.entry_type !== 'Standard' && (
        <div className="flex items-start gap-2">
          <Layers className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{draft.entry_type}</p>
        </div>
      )}

      {scopeItems.length > 0 && (
        <div className="flex items-start gap-2">
          <ClipboardList className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Scope</p>
            <p className="text-xs text-muted-foreground">{scopeItems.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
