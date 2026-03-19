import { useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MapPin, Home, Building2, Layers, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROOM_AREA_OPTIONS } from '@/types/location';
import {
  getLevelOptions,
  getExteriorOptions,
  useProjectScope,
} from '@/hooks/useProjectScope';
import type { COWizardData } from './COWizard';

interface StepLocationProps {
  data: COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
  projectId: string;
}

interface LocationFields {
  inside_outside: 'inside' | 'outside' | '';
  building: string;
  level: string;
  unit: string;
  room_area: string;
  custom_room_area: string;
  exterior_feature: string;
  custom_exterior: string;
}

const SEPARATOR = ' → ';

function parseLocationTag(tag: string): LocationFields {
  const fields: LocationFields = {
    inside_outside: '',
    building: '',
    level: '',
    unit: '',
    room_area: '',
    custom_room_area: '',
    exterior_feature: '',
    custom_exterior: '',
  };
  if (!tag) return fields;

  if (tag.startsWith('Inside')) {
    fields.inside_outside = 'inside';
    const parts = tag.split(SEPARATOR).slice(1);
    parts.forEach(p => {
      if (p.startsWith('Bldg ')) fields.building = p;
      else if (p.startsWith('Floor ') || p.startsWith('Basement') || p === 'Attic' || p === 'Mezzanine' || p === 'Other') fields.level = p;
      else if (p.startsWith('Unit ')) fields.unit = p.replace('Unit ', '');
      else fields.room_area = ROOM_AREA_OPTIONS.includes(p) ? p : (() => { fields.custom_room_area = p; return 'Other'; })();
    });
  } else if (tag.startsWith('Outside')) {
    fields.inside_outside = 'outside';
    const rest = tag.split(SEPARATOR).slice(1).join(SEPARATOR);
    if (rest) fields.exterior_feature = rest;
  }
  return fields;
}

function buildLocationTag(f: LocationFields, exteriorLabel?: string): string {
  if (f.inside_outside === 'inside') {
    const parts = ['Inside'];
    if (f.building) parts.push(f.building);
    if (f.level) parts.push(f.level);
    if (f.unit) parts.push(`Unit ${f.unit}`);
    if (f.room_area && f.room_area !== 'Other') parts.push(f.room_area);
    else if (f.room_area === 'Other' && f.custom_room_area) parts.push(f.custom_room_area);
    return parts.join(SEPARATOR);
  }
  if (f.inside_outside === 'outside') {
    const parts = ['Outside'];
    if (f.exterior_feature === 'other' && f.custom_exterior) {
      parts.push(f.custom_exterior);
    } else if (f.exterior_feature && exteriorLabel) {
      parts.push(exteriorLabel);
    }
    return parts.join(SEPARATOR);
  }
  return '';
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

export function StepLocation({ data, onChange, projectId }: StepLocationProps) {
  const { data: scope } = useProjectScope(projectId);

  const fields = useMemo(() => parseLocationTag(data.locationTag), [data.locationTag]);

  const levelOptions = useMemo(() => getLevelOptions(scope ?? null), [scope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(scope ?? null), [scope]);

  const numBuildings = scope?.num_buildings ?? 1;
  const numUnits = scope?.num_units ?? 0;

  const updateField = useCallback((field: keyof LocationFields, value: string) => {
    const next = { ...fields, [field]: value };
    // Reset dependent fields
    if (field === 'inside_outside') {
      if (value === 'inside') {
        next.exterior_feature = '';
        next.custom_exterior = '';
      } else {
        next.building = '';
        next.level = '';
        next.unit = '';
        next.room_area = '';
        next.custom_room_area = '';
      }
    }
    if (field === 'room_area' && value !== 'Other') {
      next.custom_room_area = '';
    }
    if (field === 'exterior_feature' && value !== 'other') {
      next.custom_exterior = '';
    }
    const extLabel = exteriorOptions.find(o => o.value === next.exterior_feature)?.label;
    onChange({ locationTag: buildLocationTag(next, extLabel) });
  }, [fields, onChange, exteriorOptions]);

  const isInside = fields.inside_outside === 'inside';
  const isOutside = fields.inside_outside === 'outside';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Where is the work?</h2>
        <p className="text-muted-foreground text-sm mt-1">Select the location for this change order</p>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Location</Label>
        <div className="flex gap-3">
          <ToggleButton selected={isInside} onClick={() => updateField('inside_outside', 'inside')} icon={Home}>Inside</ToggleButton>
          <ToggleButton selected={isOutside} onClick={() => updateField('inside_outside', 'outside')} icon={Building2}>Outside</ToggleButton>
        </div>
      </div>

      {isInside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          {numBuildings > 1 && (
            <div>
              <Label className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4" />Building</Label>
              <Select value={fields.building || ''} onValueChange={(v) => updateField('building', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select building..." /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: numBuildings }, (_, i) => {
                    const label = `Bldg ${String.fromCharCode(65 + i)}`;
                    return <SelectItem key={label} value={label}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4" />Level</Label>
            <Select value={fields.level || ''} onValueChange={(v) => updateField('level', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select level..." /></SelectTrigger>
              <SelectContent>
                {levelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {numUnits > 1 && (
            <div>
              <Label className="mb-2 block">Unit ID (Optional)</Label>
              <Input placeholder="e.g., 101, A" value={fields.unit || ''} onChange={(e) => updateField('unit', e.target.value)} className="h-11" />
            </div>
          )}

          <div>
            <Label className="flex items-center gap-2 mb-2"><DoorOpen className="w-4 h-4" />Room / Area</Label>
            <Select value={fields.room_area || ''} onValueChange={(v) => updateField('room_area', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select room or area..." /></SelectTrigger>
              <SelectContent>
                {ROOM_AREA_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {fields.room_area === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input placeholder="Describe the specific location..." value={fields.custom_room_area || ''} onChange={(e) => updateField('custom_room_area', e.target.value)} className="h-11" />
            </div>
          )}
        </div>
      )}

      {isOutside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4" />Exterior Feature</Label>
            <Select value={fields.exterior_feature || ''} onValueChange={(v) => updateField('exterior_feature', v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select exterior feature..." /></SelectTrigger>
              <SelectContent>
                {exteriorOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {fields.exterior_feature === 'other' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input placeholder="Describe the specific exterior location..." value={fields.custom_exterior || ''} onChange={(e) => updateField('custom_exterior', e.target.value)} className="h-11" />
            </div>
          )}
        </div>
      )}

      {data.locationTag && (
        <div className="border-l-2 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r-lg">
          <p className="text-xs text-muted-foreground">Current selection</p>
          <p className="font-medium">{data.locationTag}</p>
        </div>
      )}
    </div>
  );
}
