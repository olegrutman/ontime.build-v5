import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Home, Building2, Layers, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderWizardData, ROOM_AREA_OPTIONS } from '@/types/workOrderWizard';
import { 
  ProjectScopeDetails, 
  getLevelOptions, 
  getExteriorOptions 
} from '@/hooks/useProjectScope';

interface LocationStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  projectScope: ProjectScopeDetails | null;
}

function ToggleButton({
  selected,
  onClick,
  children,
  icon: Icon,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
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

export function LocationStep({ data, onChange, projectScope }: LocationStepProps) {
  const isInside = data.location_data.inside_outside === 'inside';
  const isOutside = data.location_data.inside_outside === 'outside';

  const levelOptions = useMemo(() => getLevelOptions(projectScope), [projectScope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(projectScope), [projectScope]);

  const updateLocation = (field: string, value: string) => {
    onChange({
      location_data: { ...data.location_data, [field]: value },
    });
  };

  const showCustomRoomArea = data.location_data.room_area === 'Other';
  const showCustomExterior = data.location_data.exterior_feature === 'other';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Location of Work</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Where will this work be performed?
        </p>
      </div>

      {/* Inside/Outside Toggle */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">
          Where is the work?
        </Label>
        <div className="flex gap-3">
          <ToggleButton
            selected={isInside}
            onClick={() => updateLocation('inside_outside', 'inside')}
            icon={Home}
          >
            Inside
          </ToggleButton>
          <ToggleButton
            selected={isOutside}
            onClick={() => updateLocation('inside_outside', 'outside')}
            icon={Building2}
          >
            Outside
          </ToggleButton>
        </div>
      </div>

      {/* Inside Location Fields */}
      {isInside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4" />
              Select Level
            </Label>
            <Select
              value={data.location_data.level || ''}
              onValueChange={(value) => updateLocation('level', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Unit ID (Optional)</Label>
            <Input
              placeholder="e.g., 101, A, 123 Main St"
              value={data.location_data.unit || ''}
              onChange={(e) => updateLocation('unit', e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <DoorOpen className="w-4 h-4" />
              Room / Area
            </Label>
            <Select
              value={data.location_data.room_area || ''}
              onValueChange={(value) => updateLocation('room_area', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select room or area..." />
              </SelectTrigger>
              <SelectContent>
                {ROOM_AREA_OPTIONS.map((room) => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomRoomArea && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input
                placeholder="Describe the specific location..."
                value={data.location_data.custom_room_area || ''}
                onChange={(e) => updateLocation('custom_room_area', e.target.value)}
                className="h-11"
              />
            </div>
          )}
        </div>
      )}

      {/* Outside Location Fields */}
      {isOutside && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4" />
              Exterior Feature
            </Label>
            <Select
              value={data.location_data.exterior_feature || ''}
              onValueChange={(value) => updateLocation('exterior_feature', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select exterior feature..." />
              </SelectTrigger>
              <SelectContent>
                {exteriorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomExterior && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Specify Location</Label>
              <Input
                placeholder="Describe the specific exterior location..."
                value={data.location_data.custom_exterior || ''}
                onChange={(e) => updateLocation('custom_exterior', e.target.value)}
                className="h-11"
              />
            </div>
          )}
        </div>
      )}

      {/* Location Summary */}
      {(data.location_data.level || data.location_data.exterior_feature) && (
        <div className="border-l-2 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r-lg">
          <p className="text-xs text-muted-foreground">Current selection</p>
          <p className="font-medium">
            {isInside
              ? [
                  data.location_data.level,
                  data.location_data.unit ? `Unit ${data.location_data.unit}` : null,
                  data.location_data.room_area === 'Other'
                    ? data.location_data.custom_room_area
                    : data.location_data.room_area,
                ]
                  .filter(Boolean)
                  .join(' → ')
              : data.location_data.exterior_feature === 'other'
              ? data.location_data.custom_exterior || 'Other'
              : exteriorOptions.find((o) => o.value === data.location_data.exterior_feature)
                  ?.label || data.location_data.exterior_feature}
          </p>
        </div>
      )}
    </div>
  );
}
