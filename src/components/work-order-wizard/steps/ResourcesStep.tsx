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

function YesNoButton({
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
        'flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all text-sm',
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
  const handleMaterialResponsibility = (resp: CostResponsibility) => {
    onChange({
      material_cost_responsibility: resp,
      // If TC is responsible, no need to ask about extra materials
      requires_materials: resp === 'TC' ? false : data.requires_materials,
    });
  };

  const handleEquipmentResponsibility = (resp: CostResponsibility) => {
    onChange({
      equipment_cost_responsibility: resp,
      // If TC is responsible, no need to ask about extra equipment
      requires_equipment: resp === 'TC' ? false : data.requires_equipment,
    });
  };

  // Show "Add extra materials?" only if GC is responsible
  const showMaterialsQuestion = data.material_cost_responsibility === 'GC';
  const showEquipmentQuestion = data.equipment_cost_responsibility === 'GC';

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Materials & Equipment</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Define cost responsibility and resource requirements
        </p>
      </div>

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
              onClick={() => handleMaterialResponsibility('TC')}
            >
              Trade Contractor
            </ResponsibilityButton>
            <ResponsibilityButton
              selected={data.material_cost_responsibility === 'GC'}
              onClick={() => handleMaterialResponsibility('GC')}
            >
              General Contractor
            </ResponsibilityButton>
          </div>
        </div>

        {showMaterialsQuestion && (
          <div className="animate-in fade-in slide-in-from-top-2 pl-4 border-l-2 border-primary/30">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Add extra materials to this work order?
            </Label>
            <div className="flex gap-3 max-w-xs">
              <YesNoButton
                selected={data.requires_materials === true}
                onClick={() => onChange({ requires_materials: true })}
              >
                Yes
              </YesNoButton>
              <YesNoButton
                selected={data.requires_materials === false}
                onClick={() => onChange({ requires_materials: false })}
              >
                No
              </YesNoButton>
            </div>
          </div>
        )}
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
              onClick={() => handleEquipmentResponsibility('TC')}
            >
              Trade Contractor
            </ResponsibilityButton>
            <ResponsibilityButton
              selected={data.equipment_cost_responsibility === 'GC'}
              onClick={() => handleEquipmentResponsibility('GC')}
            >
              General Contractor
            </ResponsibilityButton>
          </div>
        </div>

        {showEquipmentQuestion && (
          <div className="animate-in fade-in slide-in-from-top-2 pl-4 border-l-2 border-primary/30">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Add equipment to this work order?
            </Label>
            <div className="flex gap-3 max-w-xs">
              <YesNoButton
                selected={data.requires_equipment === true}
                onClick={() => onChange({ requires_equipment: true })}
              >
                Yes
              </YesNoButton>
              <YesNoButton
                selected={data.requires_equipment === false}
                onClick={() => onChange({ requires_equipment: false })}
              >
                No
              </YesNoButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
