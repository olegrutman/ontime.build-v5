import { useState, useEffect } from 'react';
import { ChangeOrderChecklist as ChecklistType } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Circle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

interface ChangeOrderChecklistProps {
  checklist: ChecklistType | null;
  requiresMaterials: boolean;
  requiresEquipment: boolean;
  hasFCParticipant: boolean;
  materialsPricingLocked?: boolean;
  linkedPOIsPriced?: boolean;
}

export function ChangeOrderChecklist({
  checklist,
  requiresMaterials,
  requiresEquipment,
  hasFCParticipant,
  materialsPricingLocked,
  linkedPOIsPriced,
}: ChangeOrderChecklistProps) {
  const effectiveMaterialsPriced = materialsPricingLocked || linkedPOIsPriced || (checklist?.materials_priced ?? false);
  const items = [
    { key: 'location_complete', label: 'Location complete', required: true },
    { key: 'scope_complete', label: 'Scope complete', required: true },
    { key: 'fc_hours_locked', label: 'Field Crew hours locked', required: hasFCParticipant },
    { key: 'tc_pricing_complete', label: 'Trade Contractor pricing complete', required: true },
    { key: 'materials_priced', label: 'Materials priced', required: requiresMaterials },
    { key: 'equipment_priced', label: 'Equipment priced', required: requiresEquipment },
  ].filter((item) => item.required);

  const completedCount = items.filter(
    (item) => item.key === 'materials_priced'
      ? effectiveMaterialsPriced
      : (checklist && checklist[item.key as keyof ChecklistType])
  ).length;

  const allComplete = completedCount === items.length;
  const progressPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const [isOpen, setIsOpen] = useState(!allComplete);

  // Auto-collapse when all complete
  useEffect(() => {
    if (allComplete) setIsOpen(false);
  }, [allComplete]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allComplete && <Check className="w-4 h-4 text-green-600" />}
                <span>Ready for Approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', allComplete ? 'text-green-600' : 'text-muted-foreground')}>
                  {allComplete ? 'All complete' : `${completedCount} of ${items.length}`}
                </span>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </div>
            </CardTitle>
            {!allComplete && !isOpen && (
              <Progress value={progressPercent} className="h-1.5 mt-2" />
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            {!allComplete && (
              <Progress value={progressPercent} className="h-1.5 mb-3" />
            )}
            {items.map((item) => {
              const isComplete = item.key === 'materials_priced'
                ? effectiveMaterialsPriced
                : (checklist && checklist[item.key as keyof ChecklistType]);
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
