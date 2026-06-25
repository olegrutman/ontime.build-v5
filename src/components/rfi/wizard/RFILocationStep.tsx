import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MapPin, Home, Building2, Layers, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROOM_AREA_OPTIONS } from '@/types/location';
import {
  ProjectScopeDetails,
  getLevelOptions,
  getExteriorOptions,
} from '@/hooks/useProjectScope';
import type { RFIWizardData } from '@/types/rfi';

interface RFILocationStepProps {
  data: RFIWizardData;
  onChange: (updates: Partial<RFIWizardData>) => void;
  projectScope: ProjectScopeDetails | null;
}

function ToggleButton({
  selected, onClick, children, icon: Icon,
}: {
  selected: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all flex-1',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

export function RFILocationStep({ data, onChange, projectScope }: RFILocationStepProps) {
  const loc = data.location_data;
  const isInside = loc.inside_outside === 'inside';
  const isOutside = loc.inside_outside === 'outside';

  const levelOptions = useMemo(() => getLevelOptions(projectScope), [projectScope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(projectScope), [projectScope]);

  const updateLoc = (field: string, value: string) => {
    onChange({ location_data: { ...loc, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Where is this RFI about?</h2>
        <p className="text-muted-foreground text-sm mt-1">Select the location the question relates to</p>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Location</Label>
        <div className="flex gap-3">
          <ToggleButton selected={isInside} onClick={() => updateLoc('inside_outside', 'inside')} icon={Home}>Inside</ToggleButton>
          <ToggleButton selected={isOutside} onClick={() => updateLoc('inside_outside', 'outside')} icon={Building2}>Outside</ToggleButton>
        </div>
      </div>

      {isInside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4" />Select Level</Label>
            <Select value={loc.level || ''} onValueChange={(v) => updateLoc('level', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select level..." /></SelectTrigger>
              <SelectContent>
                {levelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Unit ID (Optional)</Label>
            <Input placeholder="e.g., 101, A" value={loc.unit || ''} onChange={(e) => updateLoc('unit', e.target.value)} className="h-11" />
          </div>
          <div>
            <Label className="flex items-center gap-2 mb-2"><DoorOpen className="w-4 h-4" />Room / Area</Label>
            <Select value={loc.room_area || ''} onValueChange={(v) => updateLoc('room_area', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select room or area..." /></SelectTrigger>
              <SelectContent>
                {ROOM_AREA_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {loc.room_area === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input placeholder="Describe the specific location..." value={loc.custom_room_area || ''} onChange={(e) => updateLoc('custom_room_area', e.target.value)} className="h-11" />
            </div>
          )}
        </div>
      )}

      {isOutside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4" />Exterior Feature</Label>
            <Select value={loc.exterior_feature || ''} onValueChange={(v) => updateLoc('exterior_feature', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select exterior feature..." /></SelectTrigger>
              <SelectContent>
                {exteriorOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {loc.exterior_feature === 'other' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input placeholder="Describe the specific exterior location..." value={loc.custom_exterior || ''} onChange={(e) => updateLoc('custom_exterior', e.target.value)} className="h-11" />
            </div>
          )}
        </div>
      )}

      {(loc.level || loc.exterior_feature) && (
        <div className="border-l-2 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r-lg">
          <p className="text-xs text-muted-foreground">Current selection</p>
          <p className="font-medium">
            {isInside
              ? [loc.level, loc.unit ? `Unit ${loc.unit}` : null, loc.room_area === 'Other' ? loc.custom_room_area : loc.room_area].filter(Boolean).join(' → ')
              : loc.exterior_feature === 'other'
                ? loc.custom_exterior || 'Other'
                : exteriorOptions.find((o) => o.value === loc.exterior_feature)?.label || loc.exterior_feature}
          </p>
        </div>
      )}
    </div>
  );
}
