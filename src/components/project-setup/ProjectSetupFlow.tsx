import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PhaseSOV } from './PhaseSOV';
import { SetupWizardV2 } from '@/components/setup-wizard-v2/SetupWizardV2';
import { ProjectInfoSummary } from './ProjectInfoSummary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Check, DollarSign } from 'lucide-react';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName?: string;
  projectType?: string;
}

export function ProjectSetupFlow({ projectId, projectName, projectType }: ProjectSetupFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if SOV already exists (created by the unified wizard on /create-project)
  const { data: sovExists = false, isLoading: sovLoading } = useQuery({
    queryKey: ['project_sovs_lock_check', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sov').select('id').eq('project_id', projectId).limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  // Check setup answer count (for legacy projects that need the wizard)
  const { data: setupAnswerCount = 0 } = useQuery({
    queryKey: ['setup_answers_count', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('project_setup_answers')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const [setupComplete, setSetupComplete] = useState(false);

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true);
    setTimeout(() => {
      document.getElementById('sov-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleSOVComplete = useCallback(async () => {
    try {
      await supabase.from('projects').update({ status: 'active' }).eq('id', projectId);
      toast({ title: 'Project activated!', description: 'Setup complete — project is now active.' });
      navigate(`/project/${projectId}/overview`);
    } catch (e) {
      toast({ title: 'Error activating project', variant: 'destructive' });
    }
  }, [projectId, navigate, toast]);

  // If SOV already exists from the create flow, skip showing the wizard
  const wizardDone = sovExists || setupComplete || setupAnswerCount > 20;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Show summary when wizard is done, otherwise show wizard */}
      {wizardDone ? (
        <ProjectInfoSummary projectId={projectId} />
      ) : (
        <Card className="border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center gap-3">
            <h3 className="font-heading text-sm font-bold">Project Setup</h3>
            <p className="text-[11px] text-muted-foreground">
              Define your building type, scope, and generate your SOV
            </p>
          </div>
          <div className="min-h-[500px]">
            <SetupWizardV2
              projectId={projectId}
              onComplete={handleSetupComplete}
            />
          </div>
        </Card>
      )}

      {/* SOV Editor Card */}
      <Card id="sov-card" className={cn("border border-border overflow-hidden", !wizardDone && "opacity-50 pointer-events-none")}>
        <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            wizardDone ? 'bg-primary/10' : 'bg-muted/50'
          )}>
            {wizardDone ? <DollarSign className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-sm font-bold">Schedule of Values</h3>
            <p className="text-[11px] text-muted-foreground">
              {wizardDone ? 'Review, adjust, lock, and activate' : 'Complete setup to unlock SOV'}
            </p>
          </div>
          {wizardDone && (
            <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" /> Ready
            </span>
          )}
        </div>
        {wizardDone ? (
          <CardContent className="p-0">
            <PhaseSOV
              projectId={projectId}
              onComplete={handleSOVComplete}
              onStepChange={() => {}}
            />
          </CardContent>
        ) : (
          <CardContent className="py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Complete the project setup wizard to generate your SOV.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
