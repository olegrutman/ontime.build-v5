import { Package, Truck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CostResponsibility } from '@/types/changeOrderProject';
import { WorkOrderWizardData } from '@/types/workOrderWizard';

interface ResourcesStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  isGC: boolean;
}

function ResponsibilityButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all text-sm',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border hover:border-primary/50'
      )}
    >
      {children}
    </button>
  );
}

export function ResourcesStep({ data, onChange, isGC }: ResourcesStepProps) {
  return (
    <div className="space-y-8">
      {/* Materials Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Materials</h3>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Who is responsible for material costs?
          </Label>
          <div className="flex gap-3">
            <ResponsibilityButton
              selected={data.material_cost_responsibility === 'TC'}
              onClick={() => onChange({ material_cost_responsibility: 'TC' })}
            >
              Trade Contractor
            </ResponsibilityButton>
            <ResponsibilityButton
              selected={data.material_cost_responsibility === 'GC'}
              onClick={() => onChange({ material_cost_responsibility: 'GC' })}
            >
              General Contractor
            </ResponsibilityButton>
          </div>
        </div>
      </div>

      <div className="border-t" />

      {/* Equipment Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Equipment</h3>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Who is responsible for equipment costs?
          </Label>
          <div className="flex gap-3">
            <ResponsibilityButton
              selected={data.equipment_cost_responsibility === 'TC'}
              onClick={() => onChange({ equipment_cost_responsibility: 'TC' })}
            >
              Trade Contractor
            </ResponsibilityButton>
            <ResponsibilityButton
              selected={data.equipment_cost_responsibility === 'GC'}
              onClick={() => onChange({ equipment_cost_responsibility: 'GC' })}
            >
              General Contractor
            </ResponsibilityButton>
          </div>
        </div>
      </div>
    </div>
  );
}
