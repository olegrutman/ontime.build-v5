import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface CascadeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downstreamCount: number;
  onCascade: () => void;
  onKeepOthers: () => void;
  onCancel: () => void;
}

export function CascadeConfirmDialog({
  open, onOpenChange, downstreamCount, onCascade, onKeepOthers, onCancel,
}: CascadeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Schedule Change Affects Downstream Tasks</AlertDialogTitle>
          <AlertDialogDescription>
            Moving this task affects <strong>{downstreamCount}</strong> downstream task{downstreamCount !== 1 ? 's' : ''}.
            Do you want to cascade all changes automatically, or keep other tasks where they are?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="secondary" onClick={onKeepOthers}>Keep Others</Button>
          <Button onClick={onCascade}>Cascade All</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
