import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ProjectRef = { id: string; name: string };

/**
 * Shared archive / unarchive / status-change handlers for project lists.
 * Used by Dashboard and Projects Archive pages so they stay in sync.
 */
export function useProjectStatusActions(refetch: () => void) {
  const { toast } = useToast();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<ProjectRef | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<ProjectRef | null>(null);

  const updateProjectStatus = useCallback(
    async (projectId: string, status: 'active' | 'on_hold' | 'completed') => {
      const labels = { active: 'Active', on_hold: 'On Hold', completed: 'Completed' };
      const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);
      if (error) {
        toast({ title: 'Error', description: 'Failed to update project status', variant: 'destructive' });
      } else {
        toast({ title: 'Status Updated', description: `Project is now ${labels[status]}.` });
      }
      refetch();
    },
    [toast, refetch]
  );

  const unarchiveProject = useCallback(
    async (projectId: string) => {
      const { error } = await supabase.from('projects').update({ status: 'active' }).eq('id', projectId);
      if (error) {
        toast({ title: 'Error', description: 'Failed to unarchive project', variant: 'destructive' });
      } else {
        toast({ title: 'Project Restored', description: 'The project is now Active.' });
      }
      refetch();
    },
    [toast, refetch]
  );

  const requestArchive = useCallback((projectId: string, projects: { id: string; name: string }[]) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setProjectToArchive({ id: project.id, name: project.name });
    setArchiveDialogOpen(true);
  }, []);

  const confirmArchive = useCallback(async () => {
    if (!projectToArchive) return;
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectToArchive.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to archive project', variant: 'destructive' });
    } else {
      toast({ title: 'Project Archived', description: 'The project has been moved to Archived.' });
    }
    refetch();
    setArchiveDialogOpen(false);
    setProjectToArchive(null);
  }, [projectToArchive, toast, refetch]);

  const requestComplete = useCallback((projectId: string, projects: { id: string; name: string }[]) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setProjectToComplete({ id: project.id, name: project.name });
    setCompleteDialogOpen(true);
  }, []);

  const confirmComplete = useCallback(async () => {
    if (!projectToComplete) return;
    await updateProjectStatus(projectToComplete.id, 'completed');
    setCompleteDialogOpen(false);
    setProjectToComplete(null);
  }, [projectToComplete, updateProjectStatus]);

  return {
    // dialogs state
    archiveDialogOpen,
    setArchiveDialogOpen,
    projectToArchive,
    completeDialogOpen,
    setCompleteDialogOpen,
    projectToComplete,
    // actions
    updateProjectStatus,
    unarchiveProject,
    requestArchive,
    confirmArchive,
    requestComplete,
    confirmComplete,
  };
}
