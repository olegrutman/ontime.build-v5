import { ChangeOrderChecklist as ChecklistType } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeOrderChecklistProps {
  checklist: ChecklistType | null;
  requiresMaterials: boolean;
  requiresEquipment: boolean;
  hasFCParticipant: boolean;
}

export function ChangeOrderChecklist({
  checklist,
  requiresMaterials,
  requiresEquipment,
  hasFCParticipant,
}: ChangeOrderChecklistProps) {
  const items = [
    { key: 'location_complete', label: 'Location complete', required: true },
    { key: 'scope_complete', label: 'Scope complete', required: true },
    { key: 'fc_hours_locked', label: 'Field Crew hours locked', required: hasFCParticipant },
    { key: 'tc_pricing_complete', label: 'Trade Contractor pricing complete', required: true },
    { key: 'materials_priced', label: 'Materials priced', required: requiresMaterials },
    { key: 'equipment_priced', label: 'Equipment priced', required: requiresEquipment },
  ].filter((item) => item.required);

  const completedCount = items.filter(
    (item) => checklist && checklist[item.key as keyof ChecklistType]
  ).length;

  const allComplete = completedCount === items.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Ready for Approval</span>
          <span className={cn('text-xs', allComplete ? 'text-green-600' : 'text-muted-foreground')}>
            {completedCount} / {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const isComplete = checklist && checklist[item.key as keyof ChecklistType];
          return (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-2 text-sm p-2 rounded',
                isComplete ? 'text-green-700 bg-green-50' : 'text-muted-foreground'
              )}
            >
              {isComplete ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span>{item.label}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
