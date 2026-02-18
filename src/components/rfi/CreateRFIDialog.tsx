import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RFIPriority, CreateRFIPayload } from '@/types/rfi';

interface TeamOrg {
  org_id: string;
  org_name: string;
}

interface CreateRFIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentOrgId: string;
  currentUserId: string;
  teamOrgs: TeamOrg[];
  onSubmit: (payload: CreateRFIPayload) => Promise<void>;
}

export function CreateRFIDialog({
  open, onOpenChange, projectId, currentOrgId, currentUserId, teamOrgs, onSubmit,
}: CreateRFIDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState<RFIPriority>('MEDIUM');
  const [assignedToOrgId, setAssignedToOrgId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [referenceArea, setReferenceArea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSubject('');
    setQuestion('');
    setPriority('MEDIUM');
    setAssignedToOrgId('');
    setDueDate(undefined);
    setReferenceArea('');
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !question.trim() || !assignedToOrgId) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        project_id: projectId,
        subject: subject.trim(),
        question: question.trim(),
        priority,
        submitted_by_org_id: currentOrgId,
        submitted_by_user_id: currentUserId,
        assigned_to_org_id: assignedToOrgId,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        reference_area: referenceArea.trim() || null,
      });
      toast({ title: 'RFI submitted' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out own org from assign-to list
  const assignableOrgs = teamOrgs.filter((o) => o.org_id !== currentOrgId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New RFI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief title" />
          </div>
          <div>
            <Label>Question *</Label>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Describe the information you need..." rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RFIPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To *</Label>
              <Select value={assignedToOrgId} onValueChange={setAssignedToOrgId}>
                <SelectTrigger><SelectValue placeholder="Select org" /></SelectTrigger>
                <SelectContent>
                  {assignableOrgs.map((o) => (
                    <SelectItem key={o.org_id} value={o.org_id}>{o.org_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Optional'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Reference Area</Label>
              <Input value={referenceArea} onChange={(e) => setReferenceArea(e.target.value)} placeholder="e.g. Level 2, Grid B-4" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit RFI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
