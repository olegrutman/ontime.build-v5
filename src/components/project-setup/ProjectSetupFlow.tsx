import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PhaseSOV } from './PhaseSOV';
import { SetupWizardV2 } from '@/components/setup-wizard-v2/SetupWizardV2';
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

const SLUG_MAP: Record<string, string> = {
  townhome: 'townhome',
  mf_3to5: 'mf_3to5',
  mf_6plus: 'mf_6plus',
  hotel: 'hotel',
  mixed_use_commercial: 'mixed_use_commercial',
  custom_home: 'custom_home',
  senior_living: 'senior_living',
  industrial: 'industrial',
  'Single Family': 'custom_home',
  'Townhome': 'townhome',
  'Multifamily 3-5': 'mf_3to5',
  'Multifamily 6+': 'mf_6plus',
  'Hospitality': 'hotel',
  'Mixed-Use': 'mixed_use_commercial',
  'Senior Living': 'senior_living',
  'Industrial': 'industrial',
  'Single Family Home': 'custom_home',
  'Apartments/Condos': 'mf_3to5',
  'Townhomes': 'townhome',
  'Duplex': 'townhome',
  'Hotels': 'hotel',
};

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

  const [buildingTypeSlug] = useState<string>(
    SLUG_MAP[projectType || ''] || projectType || 'custom_home',
  );
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const seeded = useRef(false);

  // Seed Phase 1 answers from existing project data
  useEffect(() => {
    if (seeded.current || !projectId) return;
    seeded.current = true;
    (async () => {
      const { data: existingAnswers } = await supabase
        .from('project_setup_answers')
        .select('field_key, value')
        .eq('project_id', projectId);
      const existingKeys = new Set((existingAnswers ?? []).map((r: any) => r.field_key));

      const { data: proj } = await supabase
        .from('projects')
        .select('name, address, city, state, zip, start_date, status, description, project_type')
        .eq('id', projectId)
        .maybeSingle();

      if (!proj) return;

      const slug = SLUG_MAP[proj.project_type || ''] || buildingTypeSlug;
      const displayName = SLUG_DISPLAY[slug] || proj.project_type || '';

      const addrObj = (proj.address as any)?.street || proj.city || proj.state || proj.zip
        ? {
            street: (proj.address as any)?.street || '',
            city: proj.city || '',
            state: proj.state || '',
            zip: proj.zip || '',
          }
        : null;

      const currentBTRow = (existingAnswers ?? []).find((r: any) => r.field_key === 'building_type');
      const currentBTValue = currentBTRow ? JSON.parse((currentBTRow as any).value ?? 'null') : null;

      const seeds: { field_key: string; value: any }[] = [];
      if (!existingKeys.has('name') && proj.name) seeds.push({ field_key: 'name', value: proj.name });
      if (displayName && currentBTValue !== displayName) seeds.push({ field_key: 'building_type', value: displayName });
      if (!existingKeys.has('address') && addrObj) seeds.push({ field_key: 'address', value: addrObj });
      if (!existingKeys.has('start_date') && proj.start_date) seeds.push({ field_key: 'start_date', value: proj.start_date });
      if (!existingKeys.has('status') && proj.status) seeds.push({ field_key: 'status', value: proj.status.charAt(0).toUpperCase() + proj.status.slice(1) });
      if (!existingKeys.has('description') && proj.description) seeds.push({ field_key: 'description', value: proj.description });

      if (seeds.length > 0) {
        await supabase.from('project_setup_answers').upsert(
          seeds.map(s => ({ project_id: projectId, field_key: s.field_key, value: s.value })),
          { onConflict: 'project_id,field_key' }
        );
      }
    })();
  }, [projectId, buildingTypeSlug]);

  // Check if setup answers exist
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

  // Check if SOV exists (created by wizard save)
  const { data: sovExists = false } = useQuery({
    queryKey: ['project_sovs_lock_check', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sov').select('id').eq('project_id', projectId).limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true);
    setSetupCollapsed(true);
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

  const scopeComplete = setupComplete || setupCollapsed || setupAnswerCount > 20;
  const sovReady = scopeComplete && sovExists;

  // Auto-collapse on load if scope was already completed
  useEffect(() => {
    if (setupAnswerCount > 20 && !setupComplete) {
      setSetupCollapsed(true);
    }
  }, [setupAnswerCount, setupComplete]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Setup Engine (V2 Wizard) ─────────────────────── */}
      <Card className="border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center gap-3">
          <h3 className="font-heading text-sm font-bold">Project Setup</h3>
          <p className="text-[11px] text-muted-foreground">
            Define your building type, scope, and generate your SOV
          </p>
          {scopeComplete && (
            <span className="ml-auto px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" /> Complete
            </span>
          )}
        </div>
        <div className={cn(!setupCollapsed && "min-h-[500px]")}>
          <SetupWizardV2
            projectId={projectId}
            onComplete={handleSetupComplete}
          />
        </div>
      </Card>

      {/* ── SOV ───────────────────────────────────────────── */}
      <Card id="sov-card" className={cn("border border-border overflow-hidden", !sovReady && "opacity-50 pointer-events-none")}>
        <CardHeader2
          icon={sovReady ? <DollarSign className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          title="Schedule of Values"
          subtitle={sovReady ? 'Review, adjust, lock, and activate' : 'Complete setup to unlock SOV'}
          locked={!sovReady}
        />
        {sovReady ? (
          <CardContent className="p-0">
            <PhaseSOV
              projectId={projectId}
              onComplete={handleSOVComplete}
              onStepChange={() => {}}
            />
          </CardContent>
        ) : (
          <LockedContent message="Complete the project setup wizard to generate your SOV." />
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
