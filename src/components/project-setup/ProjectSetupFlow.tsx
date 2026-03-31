import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { SetupSidebar, type SetupPhase, type SetupProgress } from './SetupSidebar';
import { PhaseBuilding } from './PhaseBuilding';
import { PhaseContracts } from './PhaseContracts';
import { PhaseSOV } from './PhaseSOV';
import { FramingScopeWizard } from '@/components/framing-scope/FramingScopeWizard';
import { useProjectProfile } from '@/hooks/useProjectProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Building2, ClipboardList, FileText, DollarSign, ChevronRight, Check } from 'lucide-react';
import type { FramingBuildingType } from '@/types/framingScope';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName?: string;
  projectType?: string;
}

const BUILDING_TYPE_MAP: Record<string, FramingBuildingType> = {
  townhome: 'TOWNHOMES',
  apartment: 'MULTI_FAMILY',
  hotel: 'HOTEL',
  commercial: 'COMMERCIAL',
  custom_home: 'SFR',
  production_home: 'SFR',
  mixed_use: 'COMMERCIAL',
};

export function ProjectSetupFlow({ projectId, projectName, projectType }: ProjectSetupFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [currentPhase, setCurrentPhase] = useState<SetupPhase>('building');
  const [currentStep, setCurrentStep] = useState<string>('basics');

  // Check completion states
  const { data: profile } = useProjectProfile(projectId);
  const buildingComplete = !!profile?.is_complete;

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

  const progress: SetupProgress = useMemo(() => ({
    buildingComplete,
    scopeComplete,
    contractsComplete,
    sovComplete: false,
  }), [buildingComplete, scopeComplete, contractsComplete]);

  // Auto-advance to furthest incomplete phase on mount
  useEffect(() => {
    if (contractsComplete) setCurrentPhase('sov');
    else if (scopeComplete) setCurrentPhase('contracts');
    else if (buildingComplete) setCurrentPhase('scope');
    else setCurrentPhase('building');
  }, []);

  const buildingType: FramingBuildingType = BUILDING_TYPE_MAP[projectType || ''] || 'SFR';

  const handleBuildingComplete = useCallback(() => {
    setCurrentPhase('scope');
  }, []);

  const handleScopeComplete = useCallback(() => {
    setCurrentPhase('contracts');
  }, []);

  const handleContractsComplete = useCallback(() => {
    setCurrentPhase('sov');
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

  const renderPhase = () => {
    switch (currentPhase) {
      case 'building':
        return (
          <PhaseBuilding
            projectId={projectId}
            onComplete={handleBuildingComplete}
            onStepChange={setCurrentStep}
          />
        );
      case 'scope':
        return (
          <FramingScopeWizard
            projectId={projectId}
            buildingType={buildingType}
            projectName={projectName}
            embedded
            onComplete={handleScopeComplete}
          />
        );
      case 'contracts':
        return (
          <PhaseContracts
            projectId={projectId}
            onComplete={handleContractsComplete}
            onStepChange={setCurrentStep}
          />
        );
      case 'sov':
        return (
          <PhaseSOV
            projectId={projectId}
            onComplete={handleSOVComplete}
            onStepChange={setCurrentStep}
          />
        );
    }
  };

  // Mobile phase switcher
  const PHASE_ICONS = { building: Building2, scope: ClipboardList, contracts: FileText, sov: DollarSign };
  const PHASE_LABELS = { building: 'Building', scope: 'Scope', contracts: 'Contracts', sov: 'SOV' };
  const PHASE_ORDER: SetupPhase[] = ['building', 'scope', 'contracts', 'sov'];
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-200px)]">
      {/* Mobile phase bar */}
      {isMobile && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-1 overflow-x-auto bg-card">
          {PHASE_ORDER.map((phase, i) => {
            const Icon = PHASE_ICONS[phase];
            const isComplete = progress[`${phase}Complete` as keyof SetupProgress];
            const isCurrent = phase === currentPhase;
            const unlocked = i === 0 || progress[`${PHASE_ORDER[i - 1]}Complete` as keyof SetupProgress];
            return (
              <button
                key={phase}
                onClick={() => unlocked && setCurrentPhase(phase)}
                disabled={!unlocked}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  isCurrent ? 'bg-primary/10 text-primary' : isComplete ? 'text-emerald-600' : unlocked ? 'text-muted-foreground' : 'text-muted-foreground/40',
                )}
              >
                {isComplete ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
                {PHASE_LABELS[phase]}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <SetupSidebar
          currentPhase={currentPhase}
          currentStep={currentStep}
          progress={progress}
          onPhaseSelect={setCurrentPhase}
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
