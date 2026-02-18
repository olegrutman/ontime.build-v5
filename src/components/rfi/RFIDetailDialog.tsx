import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RFIStatusBadge } from './RFIStatusBadge';
import { RFIPriorityBadge } from './RFIPriorityBadge';
import { useToast } from '@/hooks/use-toast';
import type { ProjectRFI } from '@/types/rfi';

interface RFIDetailDialogProps {
  rfi: ProjectRFI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrgId: string | undefined;
  currentUserId: string | undefined;
  onAnswer: (id: string, answer: string, userId: string) => Promise<void>;
  onClose: (id: string) => Promise<void>;
}

export function RFIDetailDialog({
  rfi, open, onOpenChange, currentOrgId, currentUserId, onAnswer, onClose,
}: RFIDetailDialogProps) {
  const { toast } = useToast();
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!rfi) return null;

  const canAnswer = currentOrgId === rfi.assigned_to_org_id && rfi.status === 'OPEN';
  const canClose = rfi.status === 'ANSWERED' && (currentOrgId === rfi.submitted_by_org_id);

  const handleAnswer = async () => {
    if (!answer.trim() || !currentUserId) return;
    setSubmitting(true);
    try {
      await onAnswer(rfi.id, answer.trim(), currentUserId);
      setAnswer('');
      toast({ title: 'Answer submitted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      await onClose(rfi.id);
      toast({ title: 'RFI closed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground">RFI-{rfi.rfi_number}</span>
            <RFIPriorityBadge priority={rfi.priority} />
            <RFIStatusBadge status={rfi.status} />
          </div>
          <SheetTitle className="text-left">{rfi.subject}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">From:</span>{' '}
              <span className="font-medium">{rfi.submitted_by_org?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">To:</span>{' '}
              <span className="font-medium">{rfi.assigned_to_org?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted:</span>{' '}
              {format(new Date(rfi.created_at), 'MMM d, yyyy')}
            </div>
            {rfi.due_date && (
              <div>
                <span className="text-muted-foreground">Due:</span>{' '}
                {format(new Date(rfi.due_date), 'MMM d, yyyy')}
              </div>
            )}
            {rfi.reference_area && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Reference:</span>{' '}
                {rfi.reference_area}
              </div>
            )}
          </div>

          <Separator />

          {/* Question */}
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Question</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{rfi.question}</p>
          </div>

          <Separator />

          {/* Answer */}
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Answer</Label>
            {rfi.answer ? (
              <div className="mt-1">
                <p className="text-sm whitespace-pre-wrap">{rfi.answer}</p>
                {rfi.answered_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Answered on {format(new Date(rfi.answered_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            ) : canAnswer ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  rows={4}
                />
                <Button onClick={handleAnswer} disabled={submitting || !answer.trim()}>
                  {submitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground italic">Awaiting response</p>
            )}
          </div>

          {/* Close action */}
          {canClose && (
            <>
              <Separator />
              <Button variant="outline" onClick={handleClose} disabled={submitting} className="w-full">
                Close RFI
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
