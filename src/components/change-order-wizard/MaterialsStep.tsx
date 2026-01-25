import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CostResponsibility } from '@/types/changeOrderProject';
import { Package, Building2, HardHat } from 'lucide-react';

interface MaterialsStepProps {
  requiresMaterials: boolean;
  costResponsibility: CostResponsibility | null;
  onRequiresChange: (requires: boolean) => void;
  onResponsibilityChange: (responsibility: CostResponsibility) => void;
}

export function MaterialsStep({
  requiresMaterials,
  costResponsibility,
  onRequiresChange,
  onResponsibilityChange,
}: MaterialsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Materials Required</h3>
        <p className="text-sm text-muted-foreground">
          Will this change order require materials?
        </p>
      </div>

      <div className="space-y-3">
        <Label>Are materials required?</Label>
        <RadioGroup
          value={requiresMaterials ? 'yes' : 'no'}
          onValueChange={(value) => onRequiresChange(value === 'yes')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="materials-yes" />
            <Label htmlFor="materials-yes" className="font-normal cursor-pointer">
              Yes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="materials-no" />
            <Label htmlFor="materials-no" className="font-normal cursor-pointer">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {requiresMaterials && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <Label>Who is responsible for material cost?</Label>
          <RadioGroup
            value={costResponsibility || ''}
            onValueChange={(value) => onResponsibilityChange(value as CostResponsibility)}
            className="grid gap-3"
          >
            <div className="relative">
              <RadioGroupItem value="GC" id="cost-gc" className="peer sr-only" />
              <Label
                htmlFor="cost-gc"
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">General Contractor</p>
                  <p className="text-sm text-muted-foreground">
                    General Contractor will provide and pay for materials
                  </p>
                </div>
              </Label>
            </div>

            <div className="relative">
              <RadioGroupItem value="TC" id="cost-tc" className="peer sr-only" />
              <Label
                htmlFor="cost-tc"
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Trade Contractor</p>
                  <p className="text-sm text-muted-foreground">
                    Trade Contractor will provide materials (included in pricing)
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
