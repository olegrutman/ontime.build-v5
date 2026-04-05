import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PhaseContracts } from './PhaseContracts';
import { PhaseSOV } from './PhaseSOV';
import { SetupWizardShell } from '@/components/setup-engine/SetupWizardShell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Check, FileText, DollarSign } from 'lucide-react';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName?: string;
  projectType?: string;
}

const SLUG_MAP: Record<string, string> = {
  // Internal slugs
  townhome: 'townhome',
  apartment: 'mf_3to5',
  mf_3to5: 'mf_3to5',
  hotel: 'hotel',
  commercial: 'mixed_use_commercial',
  mixed_use_commercial: 'mixed_use_commercial',
  custom_home: 'custom_home',
  production_home: 'custom_home',
  mixed_use: 'mixed_use_commercial',
  mf_6plus: 'mf_6plus',
  senior_living: 'senior_living',
  industrial: 'industrial',
  // Display names from projects table
  'Apartments/Condos': 'mf_3to5',
  'Single Family Home': 'custom_home',
  'Townhomes': 'townhome',
  'Duplex': 'townhome',
  'Hotels': 'hotel',
  'Commercial': 'mixed_use_commercial',
  'Mixed Use': 'mixed_use_commercial',
  'Multifamily 3-5': 'mf_3to5',
  'Multifamily 6+': 'mf_6plus',
  'Senior Living': 'senior_living',
  'Industrial': 'industrial',
};

// Reverse map: slug → display name used in setup_questions options
const SLUG_DISPLAY: Record<string, string> = {
  custom_home: 'Single Family',
  townhome: 'Townhome',
  mf_3to5: 'Multifamily 3-5',
  mf_6plus: 'Multifamily 6+',
  hotel: 'Hospitality',
  mixed_use_commercial: 'Mixed-Use',
  senior_living: 'Senior Living',
  industrial: 'Industrial',
};

export function ProjectSetupFlow({ projectId, projectName, projectType }: ProjectSetupFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [buildingTypeSlug, setBuildingTypeSlug] = useState<string>(
    SLUG_MAP[projectType || ''] || projectType || 'custom_home',
  );
  const [setupComplete, setSetupComplete] = useState(false);
  const seeded = useRef(false);

  // Seed Phase 1 answers from existing project data
  useEffect(() => {
    if (seeded.current || !projectId) return;
    seeded.current = true;
    (async () => {
      // Fetch existing answers
      const { data: existingAnswers } = await supabase
        .from('project_setup_answers')
        .select('field_key')
        .eq('project_id', projectId);
      const existingKeys = new Set((existingAnswers ?? []).map((r: any) => r.field_key));

      // Fetch full project record
      const { data: proj } = await supabase
        .from('projects')
        .select('name, address, city, state, zip, start_date, status, description, project_type')
        .eq('id', projectId)
        .maybeSingle();

      if (!proj) return;

      const slug = SLUG_MAP[proj.project_type || ''] || buildingTypeSlug;
      const displayName = SLUG_DISPLAY[slug] || proj.project_type || '';

      // Build address object from project columns
      const addrObj = (proj.address as any)?.street || proj.city || proj.state || proj.zip
        ? {
            street: (proj.address as any)?.street || '',
            city: proj.city || '',
            state: proj.state || '',
            zip: proj.zip || '',
          }
        : null;

      const seeds: { field_key: string; value: any }[] = [];
      if (!existingKeys.has('name') && proj.name) seeds.push({ field_key: 'name', value: proj.name });
      if (!existingKeys.has('building_type') && displayName) seeds.push({ field_key: 'building_type', value: displayName });
      if (!existingKeys.has('address') && addrObj) seeds.push({ field_key: 'address', value: addrObj });
      if (!existingKeys.has('start_date') && proj.start_date) seeds.push({ field_key: 'start_date', value: proj.start_date });
      if (!existingKeys.has('status') && proj.status) seeds.push({ field_key: 'status', value: proj.status.charAt(0).toUpperCase() + proj.status.slice(1) });
      if (!existingKeys.has('description') && proj.description) seeds.push({ field_key: 'description', value: proj.description });

      if (seeds.length > 0) {
        await supabase.from('project_setup_answers').upsert(
          seeds.map(s => ({ project_id: projectId, field_key: s.field_key, value: JSON.stringify(s.value) })),
          { onConflict: 'project_id,field_key' }
        );
      }
    })();
  }, [projectId, buildingTypeSlug]);

  // Check if setup answers exist (phase 5 completion indicates scope done)
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

  const { data: contracts = [] } = useQuery({
    queryKey: ['project_contracts_exists_check', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('contract_sum').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const contractsComplete = contracts.some(c => (c.contract_sum || 0) > 0);

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true);
    document.getElementById('contracts-card')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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

  const scopeComplete = setupComplete || setupAnswerCount > 20;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Setup Engine (Phases 1-5) ─────────────────────── */}
      <Card className="border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center gap-3">
          <h3 className="font-heading text-sm font-bold">Project Setup</h3>
          <p className="text-[11px] text-muted-foreground">
            5-phase questionnaire — define your project, building, scope, and contract terms
          </p>
          {scopeComplete && (
            <span className="ml-auto px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" /> Complete
            </span>
          )}
        </div>
        <div className="min-h-[500px]">
          <SetupWizardShell
            projectId={projectId}
            buildingTypeSlug={buildingTypeSlug}
            onComplete={handleSetupComplete}
            onBuildingTypeChange={(slug) => setBuildingTypeSlug(SLUG_MAP[slug] || slug)}
          />
        </div>
      </Card>

      {/* ── Contracts ─────────────────────────────────────── */}
      <Card id="contracts-card" className={cn("border border-border overflow-hidden", !scopeComplete && "opacity-50 pointer-events-none")}>
        <CardHeader2
          icon={scopeComplete ? <FileText className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          title="Contracts"
          subtitle={scopeComplete ? 'Contract sums and retainage per party' : 'Complete setup first'}
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
          <LockedContent message="Complete the project setup to unlock contracts." />
        )}
      </Card>

      {/* ── SOV ───────────────────────────────────────────── */}
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
        <h3 className="font-heading text-sm font-bold">{title}</h3>
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
