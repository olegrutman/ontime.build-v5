import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSelect: (tag: string) => void;
}

const FALLBACK_LOCATIONS = [
  { id: 'l1', icon: '🏢', label: 'Level 1', sub: 'Ground floor' },
  { id: 'l2', icon: '🏢', label: 'Level 2', sub: 'Second floor' },
  { id: 'l3', icon: '🏗', label: 'Exterior', sub: 'Building exterior' },
  { id: 'base', icon: '⬇', label: 'Basement', sub: 'Below grade' },
  { id: 'roof', icon: '△', label: 'Roof', sub: 'Roofing system' },
  { id: 'garage', icon: '🚗', label: 'Garage', sub: 'Garage area' },
  { id: 'other', icon: '⊞', label: 'Other', sub: 'Specify location' },
];

function buildLocations(scope: any) {
  if (!scope) return FALLBACK_LOCATIONS;
  const locs: typeof FALLBACK_LOCATIONS = [];

  const floors = scope.floors ?? scope.stories ?? 1;
  for (let f = 1; f <= Math.min(floors, 8); f++) {
    locs.push({ id: `floor-${f}`, icon: '🏢', label: `Level ${f}`, sub: f === 1 ? 'Ground floor' : `Floor ${f}` });
  }

  if (scope.foundation_type === 'basement' || scope.basement_type) {
    locs.push({ id: 'basement', icon: '⬇', label: 'Basement', sub: scope.basement_type ?? 'Below grade' });
  }

  if (scope.roof_type) locs.push({ id: 'roof', icon: '△', label: 'Roof', sub: scope.roof_type });
  locs.push({ id: 'exterior', icon: '🏗', label: 'Exterior', sub: 'Building exterior' });
  locs.push({ id: 'garage', icon: '🚗', label: 'Garage', sub: 'Garage area' });
  locs.push({ id: 'other', icon: '⊞', label: 'Other', sub: 'Custom location' });

  return locs;
}

export function LocationSheet({ open, onClose, projectId, onSelect }: LocationSheetProps) {
  const { data: scope } = useQuery({
    queryKey: ['project-scope-for-location', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });

  const locations = buildLocations(scope);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-heading">Where is the issue?</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 pb-6">
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => onSelect(loc.label)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border active:bg-muted transition-colors text-left"
            >
              <span className="text-lg">{loc.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{loc.label}</div>
                <div className="text-xs text-muted-foreground">{loc.sub}</div>
              </div>
              <MapPin className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
