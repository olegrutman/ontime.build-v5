import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, MapPin, FileText, DollarSign, Home, Building2, Layers, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectScope, getLevelOptions, getExteriorOptions } from '@/hooks/useProjectScope';
import { ROOM_AREA_OPTIONS } from '@/types/workOrderWizard';
import { LocationData, LaborPricingType } from '@/types/changeOrderProject';

interface FCWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onSubmit: (data: FCWorkOrderData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface FCWorkOrderData {
  location_data: LocationData;
  description: string;
  pricing_type: LaborPricingType;
  hours?: number;
  hourly_rate?: number;
  lump_sum?: number;
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

export function FCWorkOrderDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onSubmit,
  isSubmitting = false,
}: FCWorkOrderDialogProps) {
  const { data: projectScope } = useProjectScope(projectId);
  
  const [locationData, setLocationData] = useState<LocationData>({});
  const [description, setDescription] = useState('');
  const [pricingType, setPricingType] = useState<LaborPricingType>('hourly');
  const [hours, setHours] = useState<number | undefined>();
  const [hourlyRate, setHourlyRate] = useState<number | undefined>();
  const [lumpSum, setLumpSum] = useState<number | undefined>();

  const levelOptions = useMemo(() => getLevelOptions(projectScope ?? null), [projectScope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(projectScope ?? null), [projectScope]);

  const isInside = locationData.inside_outside === 'inside';
  const isOutside = locationData.inside_outside === 'outside';
  const showCustomRoomArea = locationData.room_area === 'Other';
  const showCustomExterior = locationData.exterior_feature === 'other';

  const updateLocation = (field: keyof LocationData, value: string) => {
    setLocationData(prev => ({ ...prev, [field]: value }));
  };

  const hasValidLocation = !!(
    locationData.level || 
    locationData.exterior_feature
  );

  const hasValidPricing = pricingType === 'hourly'
    ? (hours ?? 0) > 0 && (hourlyRate ?? 0) > 0
    : (lumpSum ?? 0) > 0;

  const canSubmit = hasValidLocation && description.trim() && hasValidPricing;

  const calculateTotal = () => {
    if (pricingType === 'hourly') {
      return (hours ?? 0) * (hourlyRate ?? 0);
    }
    return lumpSum ?? 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    await onSubmit({
      location_data: locationData,
      description,
      pricing_type: pricingType,
      hours: pricingType === 'hourly' ? hours : undefined,
      hourly_rate: pricingType === 'hourly' ? hourlyRate : undefined,
      lump_sum: pricingType === 'lump_sum' ? lumpSum : undefined,
    });

    // Reset form
    setLocationData({});
    setDescription('');
    setPricingType('hourly');
    setHours(undefined);
    setHourlyRate(undefined);
    setLumpSum(undefined);
    onOpenChange(false);
  };

  const formatLocationSummary = () => {
    if (isInside) {
      return [
        locationData.level,
        locationData.unit ? `Unit ${locationData.unit}` : null,
        locationData.room_area === 'Other'
          ? locationData.custom_room_area
          : locationData.room_area,
      ]
        .filter(Boolean)
        .join(' → ');
    }
    if (isOutside) {
      return locationData.exterior_feature === 'other'
        ? locationData.custom_exterior || 'Other'
        : exteriorOptions.find((o) => o.value === locationData.exterior_feature)?.label || 
          locationData.exterior_feature;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Work Order to TC</DialogTitle>
          <DialogDescription>
            Submit work for approval from Trade Contractor on {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Location</h3>
            </div>

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

            {isInside && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                <div>
                  <Label className="flex items-center gap-2 mb-2 text-sm">
                    <Layers className="w-4 h-4" />
                    Level
                  </Label>
                  <Select
                    value={locationData.level || ''}
                    onValueChange={(value) => updateLocation('level', value)}
                  >
                    <SelectTrigger>
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
                  <Label className="mb-2 block text-sm">Unit ID (Optional)</Label>
                  <Input
                    placeholder="e.g., 101, A"
                    value={locationData.unit || ''}
                    onChange={(e) => updateLocation('unit', e.target.value)}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2 text-sm">
                    <DoorOpen className="w-4 h-4" />
                    Room / Area
                  </Label>
                  <Select
                    value={locationData.room_area || ''}
                    onValueChange={(value) => updateLocation('room_area', value)}
                  >
                    <SelectTrigger>
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
                  <Input
                    placeholder="Specify location..."
                    value={locationData.custom_room_area || ''}
                    onChange={(e) => updateLocation('custom_room_area', e.target.value)}
                  />
                )}
              </div>
            )}

            {isOutside && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                <div>
                  <Label className="flex items-center gap-2 mb-2 text-sm">
                    <Building2 className="w-4 h-4" />
                    Exterior Feature
                  </Label>
                  <Select
                    value={locationData.exterior_feature || ''}
                    onValueChange={(value) => updateLocation('exterior_feature', value)}
                  >
                    <SelectTrigger>
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
                  <Input
                    placeholder="Specify exterior location..."
                    value={locationData.custom_exterior || ''}
                    onChange={(e) => updateLocation('custom_exterior', e.target.value)}
                  />
                )}
              </div>
            )}

            {hasValidLocation && (
              <div className="bg-muted/50 px-3 py-2 rounded-md text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-medium">{formatLocationSummary()}</span>
              </div>
            )}
          </div>

          {/* Section 2: Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Description of Work</h3>
            </div>
            <Textarea
              placeholder="Describe the work that was performed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Section 3: Labor Pricing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Labor Pricing</h3>
            </div>

            <RadioGroup
              value={pricingType}
              onValueChange={(v) => setPricingType(v as LaborPricingType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="fc-hourly" />
                <Label htmlFor="fc-hourly">Hourly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lump_sum" id="fc-lump" />
                <Label htmlFor="fc-lump">Lump Sum</Label>
              </div>
            </RadioGroup>

            {pricingType === 'hourly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-sm">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    value={hours ?? ''}
                    onChange={(e) => setHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={hourlyRate ?? ''}
                    onChange={(e) => setHourlyRate(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>
            )}

            {pricingType === 'lump_sum' && (
              <div>
                <Label className="mb-2 block text-sm">Lump Sum Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={lumpSum ?? ''}
                  onChange={(e) => setLumpSum(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            )}

            {hasValidPricing && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit to TC
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
