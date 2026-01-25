import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CostResponsibility } from '@/types/changeOrderProject';
import { Truck, Building2, HardHat } from 'lucide-react';

interface EquipmentStepProps {
  requiresEquipment: boolean;
  costResponsibility: CostResponsibility | null;
  onRequiresChange: (requires: boolean) => void;
  onResponsibilityChange: (responsibility: CostResponsibility) => void;
}

export function EquipmentStep({
  requiresEquipment,
  costResponsibility,
  onRequiresChange,
  onResponsibilityChange,
}: EquipmentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Equipment / Machinery</h3>
        <p className="text-sm text-muted-foreground">
          Will this change order require special equipment or machinery?
        </p>
      </div>

      <div className="space-y-3">
        <Label>Is equipment/machinery needed?</Label>
        <RadioGroup
          value={requiresEquipment ? 'yes' : 'no'}
          onValueChange={(value) => onRequiresChange(value === 'yes')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="equipment-yes" />
            <Label htmlFor="equipment-yes" className="font-normal cursor-pointer">
              Yes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="equipment-no" />
            <Label htmlFor="equipment-no" className="font-normal cursor-pointer">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {requiresEquipment && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <Label>Who is responsible for equipment cost?</Label>
          <RadioGroup
            value={costResponsibility || ''}
            onValueChange={(value) => onResponsibilityChange(value as CostResponsibility)}
            className="grid gap-3"
          >
            <div className="relative">
              <RadioGroupItem value="GC" id="equip-gc" className="peer sr-only" />
              <Label
                htmlFor="equip-gc"
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">General Contractor</p>
                  <p className="text-sm text-muted-foreground">
                    General Contractor will provide or pay for equipment
                  </p>
                </div>
              </Label>
            </div>

            <div className="relative">
              <RadioGroupItem value="TC" id="equip-tc" className="peer sr-only" />
              <Label
                htmlFor="equip-tc"
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Trade Contractor</p>
                  <p className="text-sm text-muted-foreground">
                    Trade Contractor will provide equipment (included in pricing)
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
