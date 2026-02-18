import { format } from 'date-fns';
import { CalendarIcon, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { RFIWizardData, RFIPriority } from '@/types/rfi';

interface TeamOrg {
  org_id: string;
  org_name: string;
}

interface RFIRoutingStepProps {
  data: RFIWizardData;
  onChange: (updates: Partial<RFIWizardData>) => void;
  assignableOrgs: TeamOrg[];
}

export function RFIRoutingStep({ data, onChange, assignableOrgs }: RFIRoutingStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Route this RFI</h2>
        <p className="text-muted-foreground text-sm mt-1">Who should answer, and how urgent is it?</p>
      </div>

      <div>
        <Label className="mb-2 block">Assign To *</Label>
        <Select value={data.assignedToOrgId} onValueChange={(v) => onChange({ assignedToOrgId: v })}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Select organization" /></SelectTrigger>
          <SelectContent>
            {assignableOrgs.map((o) => (
              <SelectItem key={o.org_id} value={o.org_id}>{o.org_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" />Priority</Label>
        <Select value={data.priority} onValueChange={(v) => onChange({ priority: v as RFIPriority })}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Due Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-11', !data.dueDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.dueDate ? format(data.dueDate, 'MMM d, yyyy') : 'Select a due date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={data.dueDate} onSelect={(d) => onChange({ dueDate: d })} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
