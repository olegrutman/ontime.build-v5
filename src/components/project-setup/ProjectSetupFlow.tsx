import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { ProjectInfoCard } from './ProjectInfoCard';
import { PhaseContracts } from './PhaseContracts';
import { PhaseSOV } from './PhaseSOV';
import { FramingScopeWizard } from '@/components/framing-scope/FramingScopeWizard';
import { useProjectProfile } from '@/hooks/useProjectProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Check, ClipboardList, FileText, DollarSign, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { FramingBuildingType } from '@/types/framingScope';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName?: string;
  projectType?: string;
}

const SLUG_TO_BUILDING_TYPE: Record<string, FramingBuildingType> = {
  townhome: 'TOWNHOMES',
  apartment: 'MULTI_FAMILY',
  hotel: 'HOTEL',
  commercial: 'COMMERCIAL',
  custom_home: 'SFR',
  production_home: 'SFR',
  mixed_use: 'COMMERCIAL',
};

const STEPS = [
  { num: 1, label: 'Project Info', icon: Building2 },
  { num: 2, label: 'Framing Scope', icon: ClipboardList },
  { num: 3, label: 'Contracts', icon: FileText },
  { num: 4, label: 'Schedule of Values', icon: DollarSign },
];

export function ProjectSetupFlow({ projectId, projectName, projectType }: ProjectSetupFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [buildingTypeSlug, setBuildingTypeSlug] = useState<string>(projectType || '');

  const { data: profile } = useProjectProfile(projectId);
  const buildingComplete = !!profile?.is_complete;

  const buildingType: FramingBuildingType = useMemo(() => {
    return SLUG_TO_BUILDING_TYPE[buildingTypeSlug] || 'SFR';
  }, [buildingTypeSlug]);

  const { data: framingScope } = useQuery({
    queryKey: ['framing-scope', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_framing_scope' as any)
        .select('scope_complete')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const scopeComplete = !!framingScope?.scope_complete;

  const { data: contracts = [] } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('contract_sum').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const contractsComplete = contracts.some(c => (c.contract_sum || 0) > 0);

  // Compute active step for progress — step 1 (project info) is always complete
  const activeStep = contractsComplete ? 4 : scopeComplete ? 3 : 2;
  const progressPercent = ((activeStep) / STEPS.length) * 100;

  const handleContractsComplete = useCallback(() => {
    document.getElementById('sov-card')?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-0">
      {/* ── Progress Header ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-heading text-lg font-bold" style={DT.heading}>Project Info</h1>
          <span className="text-xs text-muted-foreground" style={DT.mono}>
            Step {activeStep} of {STEPS.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex items-center justify-between mt-2">
          {STEPS.map((step) => {
            const done = step.num < activeStep || (step.num === activeStep && step.num === 4 && contractsComplete);
            const current = step.num === activeStep;
            return (
              <div key={step.num} className="flex items-center gap-1.5">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  done ? 'bg-emerald-500 text-white' :
                  current ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                )}>
                  {done ? <Check className="w-3 h-3" /> : step.num}
                </div>
                <span className={cn(
                  'text-[11px] hidden sm:inline',
                  done ? 'text-emerald-700 font-medium' :
                  current ? 'text-foreground font-medium' :
                  'text-muted-foreground'
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stepper Timeline ──────────────────────────────────── */}
      <div className="relative space-y-0">

        {/* ── Step 1: Project Info Card ──────────────────────── */}
        <StepWrapper stepNum={1} activeStep={activeStep} isLast={false}>
          <ProjectInfoCard projectId={projectId} projectName={projectName} />
        </StepWrapper>

        {/* ── Step 2: Framing Scope ──────────────────────────── */}
        <StepWrapper stepNum={2} activeStep={activeStep} isLast={false}>
          <Card className="border border-border overflow-hidden">
            <CardHeader2
              icon={<ClipboardList className="w-4 h-4 text-primary" />}
              title="Framing Scope"
              subtitle="Building profile + scope of work definitions"
              complete={scopeComplete}
            />
            <FramingScopeWizard
              projectId={projectId}
              buildingType={buildingType}
              projectName={projectName}
              embedded
              onBuildingTypeChange={setBuildingTypeSlug}
              onComplete={() => {
                document.getElementById('contracts-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </Card>
        </StepWrapper>

        {/* ── Step 3: Contracts ──────────────────────────────── */}
        <StepWrapper stepNum={3} activeStep={activeStep} isLast={false}>
          <Card id="contracts-card" className={cn("border border-border overflow-hidden", !scopeComplete && "opacity-50 pointer-events-none")}>
            <CardHeader2
              icon={scopeComplete ? <FileText className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              title="Contracts"
              subtitle={scopeComplete ? 'Contract sums and retainage per party' : 'Complete framing scope first'}
              complete={contractsComplete}
              locked={!scopeComplete}
            />
            {scopeComplete ? (
              <CardContent className="p-0">
                <PhaseContracts
                  projectId={projectId}
                  onComplete={handleContractsComplete}
                  onStepChange={() => {}}
                />
              </CardContent>
            ) : (
              <LockedContent message="Complete the framing scope to unlock contracts." />
            )}
          </Card>
        </StepWrapper>

        {/* ── Step 4: SOV ────────────────────────────────────── */}
        <StepWrapper stepNum={4} activeStep={activeStep} isLast={true}>
          <Card id="sov-card" className={cn("border border-border overflow-hidden", !contractsComplete && "opacity-50 pointer-events-none")}>
            <CardHeader2
              icon={contractsComplete ? <DollarSign className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              title="Schedule of Values"
              subtitle={contractsComplete ? 'Generate, review, and activate' : 'Save contracts first'}
              locked={!contractsComplete}
            />
            {contractsComplete ? (
              <CardContent className="p-0">
                <PhaseSOV
                  projectId={projectId}
                  onComplete={handleSOVComplete}
                  onStepChange={() => {}}
                />
              </CardContent>
            ) : (
              <LockedContent message="Save contract amounts to unlock SOV generation." />
            )}
          </Card>
        </StepWrapper>
      </div>
    </div>
  );
}

/* ── Stepper wrapper with timeline connector ───────────────────────── */
function StepWrapper({ stepNum, activeStep, isLast, children }: {
  stepNum: number; activeStep: number; isLast: boolean; children: React.ReactNode;
}) {
  const done = stepNum < activeStep;
  const current = stepNum === activeStep;

  return (
    <div className="relative flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center shrink-0 pt-4">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10',
          done ? 'bg-emerald-500 text-white' :
          current ? 'bg-primary text-primary-foreground shadow-sm' :
          'bg-muted text-muted-foreground border border-border'
        )}>
          {done ? <Check className="w-3.5 h-3.5" /> : stepNum}
        </div>
        {!isLast && (
          <div className={cn(
            'w-0.5 flex-1 min-h-[24px]',
            done ? 'bg-emerald-500/40' : 'bg-border'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        {children}
      </div>
    </div>
  );
}

/* ── Shared card header ────────────────────────────────────────────── */
function CardHeader2({ icon, title, subtitle, complete, locked }: {
  icon: React.ReactNode; title: string; subtitle: string; complete?: boolean; locked?: boolean;
}) {
  return (
    <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center gap-3">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        locked ? 'bg-muted/50' : 'bg-primary/10'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-sm font-bold" style={DT.heading}>{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      {complete && (
        <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 shrink-0">
          <Check className="w-3 h-3" /> Complete
        </span>
      )}
    </div>
  );
}

/* ── Locked placeholder ────────────────────────────────────────────── */
function LockedContent({ message }: { message: string }) {
  return (
    <CardContent className="py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </CardContent>
  );
}
