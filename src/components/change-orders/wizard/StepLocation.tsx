import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MapPin, Home, Building2, Layers, DoorOpen, Plus, X } from 'lucide-react';
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

const EMPTY_FIELDS: LocationFields = {
  inside_outside: '',
  building: '',
  level: '',
  unit: '',
  room_area: '',
  custom_room_area: '',
  exterior_feature: '',
  custom_exterior: '',
};

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

function isValidTag(tag: string): boolean {
  if (!tag) return false;
  const hasInside = tag.startsWith('Inside') && tag.includes(SEPARATOR);
  const hasOutside = tag.startsWith('Outside') && tag.includes(SEPARATOR);
  return hasInside || hasOutside;
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
  const [fields, setFields] = useState<LocationFields>({ ...EMPTY_FIELDS });

  const levelOptions = useMemo(() => getLevelOptions(scope ?? null), [scope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(scope ?? null), [scope]);

  const numBuildings = scope?.num_buildings ?? 1;
  const numUnits = scope?.num_units ?? 0;

  const extLabel = exteriorOptions.find(o => o.value === fields.exterior_feature)?.label;
  const currentTag = buildLocationTag(fields, extLabel);
  const canAdd = isValidTag(currentTag);

  const updateField = useCallback((field: keyof LocationFields, value: string) => {
    setFields(prev => {
      const next = { ...prev, [field]: value };
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
      if (field === 'room_area' && value !== 'Other') next.custom_room_area = '';
      if (field === 'exterior_feature' && value !== 'other') next.custom_exterior = '';
      return next;
    });
  }, []);

  function handleAdd() {
    if (!canAdd) return;
    const updated = [...data.locationTags, currentTag];
    onChange({ locationTags: updated });
    setFields({ ...EMPTY_FIELDS });
  }

  function handleRemove(index: number) {
    const updated = data.locationTags.filter((_, i) => i !== index);
    onChange({ locationTags: updated });
  }

  const isInside = fields.inside_outside === 'inside';
  const isOutside = fields.inside_outside === 'outside';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Where is the work?</h2>
        <p className="text-muted-foreground text-sm mt-1">Add one or more locations for this change order</p>
      </div>

      {/* Added locations */}
      {data.locationTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Added locations ({data.locationTags.length})
          </Label>
          <div className="flex flex-wrap gap-2">
            {data.locationTags.map((tag, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm border border-primary/20"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[260px]">{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location builder */}
      <div className="co-light-shell p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">
          {data.locationTags.length === 0 ? 'Build a location' : 'Add another location'}
        </p>

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

        {/* Current preview + add button */}
        {currentTag && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <div className="flex-1 border-l-2 border-primary/50 pl-3 py-1.5 bg-muted/30 rounded-r-lg">
              <p className="text-xs text-muted-foreground">Preview</p>
              <p className="text-sm font-medium">{currentTag}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!canAdd}
              className="gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
