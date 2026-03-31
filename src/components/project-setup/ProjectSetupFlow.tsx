import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Lock, Check, ClipboardList, FileText, DollarSign } from 'lucide-react';
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

export function ProjectSetupFlow({ projectId, projectName, projectType }: ProjectSetupFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [buildingTypeSlug, setBuildingTypeSlug] = useState<string>(projectType || '');

  // Check completion states
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

  const handleContractsComplete = useCallback(() => {
    // Scroll to SOV card
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Project Info Card ─────────────────────────────────── */}
      <ProjectInfoCard projectId={projectId} projectName={projectName} />

      {/* ── Framing Scope Wizard Card ─────────────────────────── */}
      <Card className="border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold" style={DT.heading}>Framing Scope</h3>
            <p className="text-[10px] text-muted-foreground">Building profile + scope of work definitions</p>
          </div>
          {scopeComplete && (
            <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> Complete
            </span>
          )}
        </div>
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

      {/* ── Contracts Card ────────────────────────────────────── */}
      <Card id="contracts-card" className={cn("border border-border overflow-hidden", !scopeComplete && "opacity-60")}>
        <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            scopeComplete ? "bg-primary/10" : "bg-muted/50"
          )}>
            {scopeComplete ? (
              <FileText className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold" style={DT.heading}>Contracts</h3>
            <p className="text-[10px] text-muted-foreground">
              {scopeComplete ? 'Contract sums and retainage per party' : 'Complete framing scope first'}
            </p>
          </div>
          {contractsComplete && (
            <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        {scopeComplete ? (
          <CardContent className="p-0">
            <PhaseContracts
              projectId={projectId}
              onComplete={handleContractsComplete}
              onStepChange={() => {}}
            />
          </CardContent>
        ) : (
          <CardContent className="py-8 text-center">
            <Lock className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Complete the framing scope to unlock contracts.</p>
          </CardContent>
        )}
      </Card>

      {/* ── SOV Card ──────────────────────────────────────────── */}
      <Card id="sov-card" className={cn("border border-border overflow-hidden", !contractsComplete && "opacity-60")}>
        <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            contractsComplete ? "bg-primary/10" : "bg-muted/50"
          )}>
            {contractsComplete ? (
              <DollarSign className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold" style={DT.heading}>Schedule of Values</h3>
            <p className="text-[10px] text-muted-foreground">
              {contractsComplete ? 'Generate, review, and activate' : 'Save contracts first'}
            </p>
          </div>
        </div>
        {contractsComplete ? (
          <CardContent className="p-0">
            <PhaseSOV
              projectId={projectId}
              onComplete={handleSOVComplete}
              onStepChange={() => {}}
            />
          </CardContent>
        ) : (
          <CardContent className="py-8 text-center">
            <Lock className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Save contract amounts to unlock SOV generation.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
