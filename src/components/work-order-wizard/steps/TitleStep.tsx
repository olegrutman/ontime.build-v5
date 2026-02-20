import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Info } from 'lucide-react';
import { WorkOrderWizardData } from '@/types/workOrderWizard';

interface TitleStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

export function TitleStep({ data, onChange }: TitleStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title (Optional)</Label>
        <Input
          id="title"
          placeholder="e.g., Kitchen cabinet repair, Floor 2 bathroom framing..."
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="h-12 text-base"
        />
      </div>

      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Leave blank to auto-generate</p>
          <p>
            If you skip this step, the title will be automatically created from the
            location details you provide (e.g., "Floor 2 - Kitchen").
          </p>
        </div>
      </div>
    </div>
  );
}
