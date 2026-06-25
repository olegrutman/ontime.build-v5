import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw, Loader2 } from 'lucide-react';

interface Props {
  projectId: string;
  variant?: 'button' | 'link';
  size?: 'sm' | 'default';
  label?: string;
}

export function ResetSetupDialog({ projectId, variant = 'button', size = 'sm', label = 'Re-run setup' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('reset_project_setup', { p_project_id: projectId });
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['project', projectId] }),
        qc.invalidateQueries({ queryKey: ['project_basic', projectId] }),
        qc.invalidateQueries({ queryKey: ['setup_answers', projectId] }),
      ]);
      toast({ title: 'Setup wizard reset', description: 'Answer the questions to regenerate your scope.' });
      setOpen(false);
      navigate(`/project/${projectId}/setup`);
    } catch (e: any) {
      toast({
        title: 'Could not reset setup',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === 'link' ? (
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </button>
        ) : (
          <Button variant="outline" size={size} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-run setup wizard?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your setup answers and reopens the wizard. Existing contracts, team, and SOV will be preserved unless you change them in the wizard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Re-run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
