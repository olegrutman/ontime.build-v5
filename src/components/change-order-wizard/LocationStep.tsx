import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LocationData, LEVEL_OPTIONS, ROOM_AREA_OPTIONS } from '@/types/changeOrderProject';

interface LocationStepProps {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

export function LocationStep({ data, onChange }: LocationStepProps) {
  const updateField = (field: keyof LocationData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Where is the work located?</h3>
      </div>

      {/* Inside/Outside */}
      <div className="space-y-3">
        <Label>Location Type</Label>
        <RadioGroup
          value={data.inside_outside || ''}
          onValueChange={(value) => updateField('inside_outside', value as 'inside' | 'outside')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="inside" id="inside" />
            <Label htmlFor="inside" className="font-normal cursor-pointer">
              Inside
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="outside" id="outside" />
            <Label htmlFor="outside" className="font-normal cursor-pointer">
              Outside
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Level */}
      <div className="space-y-3">
        <Label>Level</Label>
        <Select
          value={data.level || ''}
          onValueChange={(value) => updateField('level', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select level..." />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit (optional) */}
      <div className="space-y-3">
        <Label>Unit (Optional)</Label>
        <Input
          placeholder="e.g., A, 101, 2B"
          value={data.unit || ''}
          onChange={(e) => updateField('unit', e.target.value)}
        />
      </div>

      {/* Room/Area */}
      <div className="space-y-3">
        <Label>Room / Area</Label>
        <Select
          value={data.room_area || ''}
          onValueChange={(value) => updateField('room_area', value)}
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
    </div>
  );
}
