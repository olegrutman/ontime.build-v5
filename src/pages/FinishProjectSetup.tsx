import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2, X, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ProjectShell } from '@/components/app-shell/ProjectShell';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { cn } from '@/lib/utils';
import { OrgType } from '@/types/organization';
import { useSetupWizardV2 } from '@/hooks/useSetupWizardV2';
import { EditableInfoRow, type RowFieldType } from '@/components/project-setup/EditableInfoRow';

import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
import { ScopeBoundariesPanel } from '@/components/setup-wizard-v2/ScopeBoundariesPanel';
import { ContractsStep, type DownstreamContractRow } from '@/components/project-wizard-new/ContractsStep';
import { ContractModeSelector, type ContractMode } from '@/components/project-wizard-new/ContractModeSelector';
import { TeamStep } from '@/components/project-wizard-new/TeamStep';
import { TMBuildingInfoStep, initialTMBuildingInfo, type TMBuildingInfo } from '@/components/project-wizard-new/TMBuildingInfoStep';

interface StepDef { id: string; label: string; description: string; }

const FIXED_STEPS: StepDef[] = [
  { id: 'building_info', label: 'Building Info', description: 'Confirm structure' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'invite_team', label: 'Invite Team', description: 'Add downstream crews' },
  { id: 'contracts', label: 'Contracts', description: 'Owner + downstream values' },
  { id: 'scope_boundaries', label: 'Scope Boundaries', description: "What's in your scope?" },
  { id: 'scope', label: 'Scope', description: 'Scope & SOV' },
  { id: 'review', label: 'Review', description: 'Finalize' },
];

const TM_STEPS: StepDef[] = [
  { id: 'building_info', label: 'Building Info', description: 'Confirm structure' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'invite_team', label: 'Invite Team', description: 'Add downstream crews' },
  { id: 'contracts', label: 'Contracts', description: 'Owner + downstream values' },
  { id: 'review', label: 'Review', description: 'Finalize' },
];

export default function FinishProjectSetup() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles } = useAuth();
  const qc = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [contractMode, setContractMode] = useState<ContractMode>('fixed');
  const [tmScope, setTmScope] = useState<TMBuildingInfo>(initialTMBuildingInfo);
  const [selfPerform, setSelfPerform] = useState(false);
  const [ownerContractValue, setOwnerContractValue] = useState<number>(0);
  // Local edits to downstream contract sums keyed by project_contracts.id
  const [downstreamEdits, setDownstreamEdits] = useState<Record<string, number>>({});

  const currentOrg = userOrgRoles[0]?.organization;
  const currentOrgId = currentOrg?.id;
  const creatorOrgType = currentOrg?.type as OrgType | undefined;
  const isGC = creatorOrgType === 'GC';
  const isTC = creatorOrgType === 'TC';
  const downstreamRoleLabel = isGC ? 'Trade Contractor' : isTC ? 'Field Crew' : null;

  const wizard = useSetupWizardV2(projectId);

  // Load project + scope details + all contracts + supplier org name
  const { data: ctx, isLoading, refetch: refetchCtx } = useQuery({
    queryKey: ['finish_setup_ctx', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [proj, scope, contracts] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId!).maybeSingle(),
        supabase.from('project_scope_details').select('*').eq('project_id', projectId!).maybeSingle(),
        supabase
          .from('project_contracts')
          .select('*, from_org:from_org_id(id,name), to_org:to_org_id(id,name)')
          .eq('project_id', projectId!),
      ]);
      return { project: proj.data, scope: scope.data, contracts: (contracts.data || []) as any[] };
    },
  });

  // Team query — used for "self-perform" reset and downstream contract list
  const { data: teamData, refetch: refetchTeam } = useQuery({
    queryKey: ['finish_setup_team', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_team')
        .select('id, org_id, role, invited_org_name, status')
        .eq('project_id', projectId!);
      return data || [];
    },
  });

  // Prefill TM building info from project_scope_details
  useEffect(() => {
    if (!ctx?.scope) return;
    setTmScope(prev => ({
      ...prev,
      buildingType: ctx.scope!.home_type || prev.buildingType,
      stories: ctx.scope!.stories || ctx.scope!.floors || prev.stories,
      foundationType: (ctx.scope!.foundation_type as any) || prev.foundationType,
      basementType: (ctx.scope!.basement_type as any) || prev.basementType,
      basementFinish: (ctx.scope!.basement_finish as any) || prev.basementFinish,
      garageType: (ctx.scope!.garage_type as any) || prev.garageType,
      sidingIncluded: ctx.scope!.siding_included ?? prev.sidingIncluded,
      sidingMaterials: Array.isArray(ctx.scope!.siding_materials) ? (ctx.scope!.siding_materials as string[]) : prev.sidingMaterials,
      totalSqft: ctx.scope!.total_sqft || prev.totalSqft,
    }));
  }, [ctx?.scope]);

  // Keep the SOV wizard's buildingType in sync with the Building Info step,
  // since the standalone Building Type step has been removed.
  useEffect(() => {
    if (tmScope.buildingType && tmScope.buildingType !== wizard.buildingType) {
      wizard.selectBuildingType(tmScope.buildingType as any);
    }
  }, [tmScope.buildingType, wizard.buildingType, wizard.selectBuildingType]);

  // Supplier contract (locked, displayed when buyer is material-responsible)
  const supplierContract = useMemo(() => {
    const row = (ctx?.contracts || []).find(c =>
      (c.from_role || '').toLowerCase().includes('supplier'),
    );
    if (!row) return null;
    const name = row.from_org?.name || 'Supplier';
    return { supplier_name: name, amount: Number(row.contract_sum || 0) };
  }, [ctx?.contracts]);

  // Existing owner→GC contract (if any) — used to prefill input
  const ownerContractRow = useMemo(
    () => (ctx?.contracts || []).find(c => (c.from_role || '').toLowerCase() === 'owner'),
    [ctx?.contracts],
  );
  useEffect(() => {
    if (ownerContractRow) setOwnerContractValue(Number(ownerContractRow.contract_sum || 0));
  }, [ownerContractRow]);

  // Downstream rows: driven by project_team (source of truth). Merge in any existing
  // project_contracts row to surface a previously saved contract_sum.
  // Row id = project_team.id (NOT project_contracts.id) so the list is stable even
  // before any contract row exists.
  const downstreamContracts: DownstreamContractRow[] = useMemo(() => {
    if (!currentOrgId || !downstreamRoleLabel) return [];
    const members = (teamData || []).filter(
      t => (t.role || '').toLowerCase() === downstreamRoleLabel.toLowerCase(),
    );
    return members.map(m => {
      const existing = (ctx?.contracts || []).find(
        c => c.to_project_team_id === m.id && c.to_org_id === currentOrgId,
      );
      const savedSum = existing ? Number(existing.contract_sum || 0) : 0;
      return {
        id: m.id,
        org_name: m.invited_org_name || 'Pending invite',
        role: m.role,
        trade: existing?.trade ?? null,
        contract_sum: downstreamEdits[m.id] ?? savedSum,
        invited_only: m.status !== 'Accepted',
      };
    });
  }, [ctx?.contracts, teamData, currentOrgId, downstreamRoleLabel, downstreamEdits]);

  const handleDownstreamChange = useCallback((id: string, contractSum: number) => {
    setDownstreamEdits(prev => ({ ...prev, [id]: contractSum }));
  }, []);


  // Sync wizard.answers.contract_value so SOV generation uses a sane number.
  // Use owner contract for GC; sum of downstream as fallback / for TC use TC's incoming GC contract value.
  useEffect(() => {
    const downstreamSum = downstreamContracts.reduce((s, r) => s + (r.contract_sum || 0), 0);
    if (isGC) {
      const v = ownerContractValue > 0 ? ownerContractValue : downstreamSum;
      if (v > 0) wizard.setAnswer('contract_value', v);
      if (downstreamSum > 0) wizard.setAnswer('fc_contract_value', downstreamSum);
    } else if (isTC) {
      // TC's upstream value comes from existing GC→TC contract if present;
      // their downstream FC sum drives fc_contract_value
      if (downstreamSum > 0) wizard.setAnswer('fc_contract_value', downstreamSum);
    }
  }, [ownerContractValue, downstreamContracts, isGC, isTC, wizard.setAnswer]);

  const isTM = contractMode === 'tm';
  const activeSteps = useMemo(() => (isTM ? TM_STEPS : FIXED_STEPS), [isTM]);

  useEffect(() => {
    if (currentStep > activeSteps.length - 1) setCurrentStep(activeSteps.length - 1);
  }, [activeSteps.length, currentStep]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);


  // When the project is already active, show the read-only Project Summary
  // instead of the setup wizard. The wizard is shown only while the project
  // is still in 'setup' or 'draft'.
  const isActiveProject =
    !!ctx?.project &&
    !ctx.project.setup_completion_required &&
    ctx.project.status !== 'setup' &&
    ctx.project.status !== 'draft';

  const hasInvitedDownstream = downstreamContracts.length > 0;

  const canProceed = (): boolean => {
    const stepId = activeSteps[currentStep]?.id;
    switch (stepId) {
      case 'building_info':
        return !!(tmScope.buildingType && tmScope.stories >= 1 && tmScope.foundationType);
      case 'mode':
        return true;
      case 'invite_team':
        return selfPerform || hasInvitedDownstream;
      case 'contracts': {
        if (selfPerform) return true;
        if (downstreamContracts.length === 0) return false;
        // Require a value > 0 only for Accepted partners. Invited-only members
        // may be left at $0 (to be negotiated after they accept).
        return downstreamContracts.every(r => r.invited_only || (r.contract_sum || 0) > 0);
      }
      case 'building_type':
        return !!wizard.buildingType;
      case 'scope_boundaries':
      case 'scope':
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => setCurrentStep(p => Math.min(p + 1, activeSteps.length - 1));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));


  const finish = async () => {
    if (!projectId || !currentOrgId || !user?.id) return;
    setSaving(true);
    try {
      // 1. Upsert project_scope_details (building info)
      const scopePayload = {
        project_id: projectId,
        home_type: tmScope.buildingType,
        floors: tmScope.stories,
        stories: tmScope.stories,
        foundation_type: tmScope.foundationType || null,
        basement_type: tmScope.foundationType === 'Basement' ? (tmScope.basementType || null) : null,
        basement_finish: tmScope.foundationType === 'Basement' ? (tmScope.basementFinish || null) : null,
        garage_type: tmScope.garageType,
        siding_included: tmScope.sidingIncluded,
        siding_materials: tmScope.sidingIncluded && tmScope.sidingMaterials?.length ? tmScope.sidingMaterials : null,
        total_sqft: tmScope.totalSqft || null,
      };
      if (ctx?.scope) {
        await supabase.from('project_scope_details').update(scopePayload).eq('project_id', projectId);
      } else {
        await supabase.from('project_scope_details').insert(scopePayload);
      }

      // 2. Persist owner contract (GC only, optional)
      if (isGC && ownerContractValue > 0) {
        if (ownerContractRow) {
          await supabase
            .from('project_contracts')
            .update({ contract_sum: ownerContractValue })
            .eq('id', ownerContractRow.id);
        } else {
          await supabase.from('project_contracts').insert({
            project_id: projectId,
            from_org_id: null,
            from_role: 'Owner',
            to_org_id: currentOrgId,
            to_role: 'General Contractor',
            contract_sum: ownerContractValue,
            status: 'Active',
            created_by_user_id: user.id,
          });
        }
      }

      // 3. Upsert downstream contracts (one row per invited team member).
      const myToRole = isGC ? 'General Contractor' : isTC ? 'Trade Contractor' : null;
      if (myToRole && !selfPerform) {
        const downstreamMembers = (teamData || []).filter(
          t => downstreamRoleLabel && (t.role || '').toLowerCase() === downstreamRoleLabel.toLowerCase(),
        );
        for (const m of downstreamMembers) {
          const sum = downstreamEdits[m.id] ?? 0;
          const existing = (ctx?.contracts || []).find(
            c => c.to_project_team_id === m.id && c.to_org_id === currentOrgId,
          );
          if (existing) {
            if (sum !== Number(existing.contract_sum || 0)) {
              const { error } = await supabase
                .from('project_contracts')
                .update({ contract_sum: sum })
                .eq('id', existing.id);
              if (error) throw error;
            }
          } else {
            const { error } = await supabase.from('project_contracts').insert({
              project_id: projectId,
              from_org_id: m.org_id,
              from_role: m.role,
              to_org_id: currentOrgId,
              to_role: myToRole,
              to_project_team_id: m.id,
              contract_sum: sum,
              retainage_percent: 0,
              created_by_user_id: user.id,
            });
            if (error) throw error;
          }
        }
      }


      // 4. For fixed mode: run wizard save (creates SOV + placeholder primary contract record)
      if (!isTM && wizard.buildingType) {
        await wizard.saveAll(projectId, currentOrgId, currentOrg.type, user.id);
      }

      // 5. Mark setup complete + update contract_mode / project_type
      await supabase
        .from('projects')
        .update({
          setup_completion_required: false,
          contract_mode: contractMode,
          project_type: isTM ? 'Remodel / T&M' : (wizard.buildingType || tmScope.buildingType || ''),
        })
        .eq('id', projectId);

      toast({ title: 'Project setup complete', description: 'Your project is fully configured.' });
      navigate(`/project/${projectId}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Finish Setup">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const renderStep = () => {
    const stepId = activeSteps[currentStep]?.id;
    switch (stepId) {
      case 'building_info':
        return (
          <TMBuildingInfoStep
            data={tmScope}
            onChange={(u) => setTmScope(prev => ({ ...prev, ...u }))}
            hideMaterialResponsibility
            title="Confirm Building Info"
            description="The supplier provided initial structure data. Review and adjust before generating your scope."
          />
        );
      case 'mode':
        return <ContractModeSelector selected={contractMode} onSelect={setContractMode} />;
      case 'invite_team':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Invite Your Team</h2>
              <p className="text-sm text-muted-foreground">
                {isGC
                  ? 'Add the trade contractors who will work on this project. You\'ll enter what you\'re paying each one on the next step.'
                  : 'Add the field crews who will work for you on this project. You\'ll enter what you\'re paying each one on the next step.'}
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
              <Checkbox
                id="self-perform"
                checked={selfPerform}
                onCheckedChange={(v) => {
                  setSelfPerform(!!v);
                }}
              />
              <Label htmlFor="self-perform" className="text-sm cursor-pointer">
                I'm self-performing — no {downstreamRoleLabel?.toLowerCase()}s to invite.
              </Label>
            </div>

            {!selfPerform && (
              <TeamStep
                team={[]}
                onChange={() => {}}
                onTeamChange={() => {
                  refetchTeam();
                  refetchCtx();
                }}
                creatorRole={creatorOrgType || null}
                projectId={projectId}
                creatorOrgType={creatorOrgType || null}
              />
            )}
          </div>
        );
      case 'contracts':
        return (
          <ContractsStep
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            setAnswer={wizard.setAnswer}
            sovLines={wizard.sovLines}
            visibleQuestions={wizard.visibleQuestions}
            creatorOrgType={creatorOrgType}
            adoptionMode
            supplierContract={supplierContract}
            downstreamContracts={downstreamContracts}
            onDownstreamChange={handleDownstreamChange}
            ownerContractValue={ownerContractValue}
            onOwnerContractChange={setOwnerContractValue}
          />
        );
      case 'building_type':
        return <BuildingTypeSelector selected={wizard.buildingType} onSelect={(bt) => wizard.selectBuildingType(bt)} />;
      case 'scope_boundaries':
        return wizard.buildingType ? (
          <ScopeBoundariesPanel
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            setAnswer={wizard.setAnswer}
            sovLines={wizard.sovLines}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Pick a building type first.</p>
        );
      case 'scope':
        return wizard.buildingType ? (
          <ScopeQuestionsPanel
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            setAnswer={wizard.setAnswer}
            visibleQuestions={wizard.visibleQuestions}
            sovLines={wizard.sovLines}
            contractValue={typeof wizard.answers.contract_value === 'number' ? wizard.answers.contract_value : 0}
            fcContractValue={typeof wizard.answers.fc_contract_value === 'number' ? wizard.answers.fc_contract_value : 0}
            creatorOrgType={creatorOrgType}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Pick a building type first.</p>
        );
      case 'review': {
        const downstreamSum = downstreamContracts.reduce((s, r) => s + (r.contract_sum || 0), 0);
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Ready to finalize</h2>
            <p className="text-sm text-muted-foreground">
              We'll save your building info{!isTM ? ', contracts, and generated SOV' : ' and contracts'}, then unlock the full dashboard.
            </p>
            <Card><CardContent className="p-4 text-sm space-y-1.5">
              {supplierContract && (
                <p><span className="text-muted-foreground">Supplier ({supplierContract.supplier_name}):</span> <span className="font-mono">${supplierContract.amount.toLocaleString()}</span> <span className="text-xs text-muted-foreground">(locked)</span></p>
              )}
              {isGC && (
                <p><span className="text-muted-foreground">Owner → You:</span> <span className="font-mono">${ownerContractValue.toLocaleString()}</span>{ownerContractValue === 0 && <span className="text-xs text-muted-foreground"> (skipped)</span>}</p>
              )}
              <p><span className="text-muted-foreground">You → downstream ({downstreamContracts.length}):</span> <span className="font-mono">${downstreamSum.toLocaleString()}</span></p>
            </CardContent></Card>
          </div>
        );
      }
      default: return null;
    }
  };

  const isLastStep = currentStep === activeSteps.length - 1;

  // ----- Read-only Project Summary (shown for already-active projects) -----
  if (isActiveProject && ctx?.project) {
    const p = ctx.project as any;
    const s = ctx.scope as any | null;
    const addr = (p.address && typeof p.address === 'object') ? p.address : null;

    const ownerRow = (ctx.contracts || []).find((c: any) => (c.from_role || '').toLowerCase() === 'owner');
    const supplierRow = (ctx.contracts || []).find((c: any) => (c.from_role || '').toLowerCase().includes('supplier'));
    const downstreamRows = (ctx.contracts || []).filter(
      (c: any) => c.to_org_id === currentOrgId && (c.from_role || '').toLowerCase() !== 'owner' && !(c.from_role || '').toLowerCase().includes('supplier'),
    );
    const fmt$ = (n: number | null | undefined) => `$${Number(n || 0).toLocaleString()}`;

    const invalidate = () => qc.invalidateQueries({ queryKey: ['finish_setup_ctx', projectId] });

    const saveProject = (field: string) => async (val: any) => {
      const { error } = await supabase.from('projects').update({ [field]: val }).eq('id', projectId!);
      if (error) throw error;
      invalidate();
    };
    const saveAddress = (field: 'street' | 'city' | 'state' | 'zip') => async (val: any) => {
      if (field === 'city' || field === 'state' || field === 'zip') {
        const { error } = await supabase.from('projects').update({ [field]: val }).eq('id', projectId!);
        if (error) throw error;
      } else {
        const next = { ...(addr || {}), street: val };
        const { error } = await supabase.from('projects').update({ address: next }).eq('id', projectId!);
        if (error) throw error;
      }
      invalidate();
    };
    const saveScope = (field: string) => async (val: any) => {
      if (!s) {
        const { error } = await supabase.from('project_scope_details').insert({ project_id: projectId!, [field]: val } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_scope_details').update({ [field]: val }).eq('project_id', projectId!);
        if (error) throw error;
      }
      invalidate();
    };
    const saveContract = (id: string, field: string) => async (val: any) => {
      const { error } = await supabase.from('project_contracts').update({ [field]: val }).eq('id', id);
      if (error) throw error;
      invalidate();
    };

    const opts = (arr: string[]) => arr.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const projectTypeOpts = opts(['residential', 'commercial', 'mixed_use', 'Remodel / T&M']);
    const buildTypeOpts = opts(['new_construction', 'renovation', 'addition']);
    const contractModeOpts = [{ value: 'fixed', label: 'Fixed Price' }, { value: 'tm', label: 'T&M / Remodel' }];
    const statusOpts = opts(['draft', 'setup', 'active', 'on_hold', 'closed', 'archived']);
    const homeTypeOpts = opts(['custom_home', 'track_home', 'townhomes', 'apartments_mf', 'hotel_hospitality', 'senior_living']);
    const foundationOpts = ['Slab', 'Crawl', 'Basement', 'Pier'].map(v => ({ value: v, label: v }));
    const garageOpts = opts(['attached', 'detached', 'none']);
    const markupVisOpts = opts(['hidden', 'summary', 'detailed']);

    const sections: { id: string; label: string }[] = [
      { id: 'project-details', label: 'Project Details' },
      { id: 'building-info', label: 'Building Info' },
      { id: 'building-features', label: 'Building Features' },
      { id: 'financials', label: 'Financial Settings' },
      { id: 'approvals', label: 'Approvals' },
      { id: 'contracts', label: 'Contracts' },
      ...((teamData || []).length > 0 ? [{ id: 'team', label: 'Team' }] : []),
    ];

    const SectionCard: React.FC<{
      id: string;
      title: string;
      meta?: React.ReactNode;
      highlight?: boolean;
      children: React.ReactNode;
    }> = ({ id, title, meta, highlight, children }) => (
      <section
        id={id}
        className={cn(
          'scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden',
          highlight && 'ring-4 ring-primary/10',
        )}
      >
        <div className={cn(
          'px-6 py-4 border-b flex items-center justify-between',
          highlight ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border/60',
        )}>
          <h2 className={cn(
            'text-lg font-bold tracking-tight uppercase font-heading',
            highlight ? 'text-primary-foreground' : 'text-foreground',
          )}>
            {title}
          </h2>
          {meta && (
            <span className={cn(
              'text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider',
              highlight ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-background text-muted-foreground border border-border',
            )}>
              {meta}
            </span>
          )}
        </div>
        <div className="divide-y divide-border/40">{children}</div>
      </section>
    );

    return (
      <ProjectShell projectName={p.name || 'Project'} projectId={projectId!} projectStatus={p.status || 'active'}>
        <div className="flex flex-1 overflow-hidden lg:pr-3 lg:pt-3">
          <ProjectSidebar isSupplier={creatorOrgType === 'SUPPLIER'} isTM={p.contract_mode === 'tm'} />
          <main className="flex-1 overflow-auto lg:ml-[200px] xl:ml-[220px]">
            <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-8 pb-36 lg:pb-12">

              {/* Page header */}
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading mb-1">
                  Project Information Sheet
                </p>
                <h1 className="text-3xl font-bold font-heading tracking-tight">{p.name || 'Project'}</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Click any field to edit · Press <kbd className="px-1 py-0.5 text-[10px] rounded border bg-muted">Enter</kbd> to save · <kbd className="px-1 py-0.5 text-[10px] rounded border bg-muted">Esc</kbd> to cancel
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Section nav — floating sticky panel */}
                <aside className="lg:w-56 flex-shrink-0 lg:self-start lg:sticky lg:top-4 z-10">
                  <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-lg p-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-heading">
                      Jump to Section
                    </h3>
                    <nav className="space-y-0.5">
                      {sections.map((sec, idx) => (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="flex items-center group py-1.5 px-2 -mx-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <span className={cn(
                            'w-1 rounded-full mr-3 transition-all bg-border group-hover:bg-primary',
                            idx === 0 ? 'h-4 bg-primary' : 'h-1 group-hover:h-4',
                          )} />
                          {sec.label}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>

                {/* Sections */}
                <div className="flex-1 space-y-6 min-w-0">

                  <SectionCard id="project-details" title="Project Details" meta={p.status ? `Status: ${p.status}` : undefined}>
                    <EditableInfoRow label="Name" value={p.name} type="text" onSave={saveProject('name')} />
                    <EditableInfoRow label="Status" value={p.status} type="select" options={statusOpts} onSave={saveProject('status')} />
                    <EditableInfoRow label="Contract Mode" value={p.contract_mode || 'fixed'} type="select" options={contractModeOpts} onSave={saveProject('contract_mode')} />
                    <EditableInfoRow label="Project Type" value={p.project_type} type="select" options={projectTypeOpts} onSave={saveProject('project_type')} />
                    <EditableInfoRow label="Build Type" value={p.build_type} type="select" options={buildTypeOpts} onSave={saveProject('build_type')} />
                    <EditableInfoRow label="Street" value={addr?.street ?? ''} type="text" onSave={saveAddress('street')} placeholder="123 Main St" />
                    <EditableInfoRow label="City" value={p.city} type="text" onSave={saveAddress('city')} />
                    <EditableInfoRow label="State" value={p.state} type="text" onSave={saveAddress('state')} />
                    <EditableInfoRow label="Zip" value={p.zip} type="text" onSave={saveAddress('zip')} />
                    <EditableInfoRow label="Start Date" value={p.start_date} type="date" onSave={saveProject('start_date')} />
                    <EditableInfoRow label="Description" value={p.description} type="text" onSave={saveProject('description')} />
                  </SectionCard>

                  <SectionCard id="building-info" title="Building Info">
                    <EditableInfoRow label="Building Type" value={s?.home_type} type="select" options={homeTypeOpts} onSave={saveScope('home_type')} />
                    <EditableInfoRow label="Stories" value={s?.stories ?? s?.floors} type="number" onSave={saveScope('stories')} />
                    <EditableInfoRow label="Foundation" value={s?.foundation_type} type="select" options={foundationOpts} onSave={saveScope('foundation_type')} />
                    {s?.foundation_type === 'Basement' && (
                      <>
                        <EditableInfoRow label="Basement Type" value={s?.basement_type} type="text" onSave={saveScope('basement_type')} />
                        <EditableInfoRow label="Basement Finish" value={s?.basement_finish} type="text" onSave={saveScope('basement_finish')} />
                      </>
                    )}
                    <EditableInfoRow label="Construction Type" value={s?.construction_type} type="text" onSave={saveScope('construction_type')} />
                    <EditableInfoRow label="Framing Method" value={s?.framing_method} type="text" onSave={saveScope('framing_method')} />
                    <EditableInfoRow label="Roof Type" value={s?.roof_type} type="text" onSave={saveScope('roof_type')} />
                    <EditableInfoRow label="Stairs Type" value={s?.stairs_type} type="text" onSave={saveScope('stairs_type')} />
                    <EditableInfoRow label="# Buildings" value={s?.num_buildings} type="number" onSave={saveScope('num_buildings')} />
                    <EditableInfoRow label="# Units" value={s?.num_units} type="number" onSave={saveScope('num_units')} />
                    <EditableInfoRow label="Stories per Unit" value={s?.stories_per_unit} type="number" onSave={saveScope('stories_per_unit')} />
                    <EditableInfoRow label="Shared Walls" value={!!s?.has_shared_walls} type="boolean" onSave={saveScope('has_shared_walls')} />
                    <EditableInfoRow label="Bedrooms" value={s?.bedrooms} type="number" onSave={saveScope('bedrooms')} />
                    <EditableInfoRow label="Bathrooms" value={s?.bathrooms} type="number" onSave={saveScope('bathrooms')} />
                    <EditableInfoRow label="Garage" value={s?.garage_type} type="select" options={garageOpts} onSave={saveScope('garage_type')} />
                    <EditableInfoRow label="Garage Cars" value={s?.garage_cars} type="number" onSave={saveScope('garage_cars')} />
                    <EditableInfoRow label="Total Sqft" value={s?.total_sqft} type="number" mono onSave={saveScope('total_sqft')} />
                    <EditableInfoRow label="Lot Size (acres)" value={s?.lot_size_acres} type="number" onSave={saveScope('lot_size_acres')} />
                    <EditableInfoRow label="Scope Notes" value={s?.scope_description} type="text" onSave={saveScope('scope_description')} />
                  </SectionCard>

                  <SectionCard id="building-features" title="Building Features">
                    <EditableInfoRow label="Elevator" value={!!s?.has_elevator} type="boolean" onSave={saveScope('has_elevator')} />
                    <EditableInfoRow label="Roof Deck" value={!!s?.has_roof_deck} type="boolean" onSave={saveScope('has_roof_deck')} />
                    <EditableInfoRow label="Covered Porches" value={!!s?.has_covered_porches} type="boolean" onSave={saveScope('has_covered_porches')} />
                    <EditableInfoRow label="Balconies" value={!!s?.has_balconies} type="boolean" onSave={saveScope('has_balconies')} />
                    <EditableInfoRow label="Decking Included" value={!!s?.decking_included} type="boolean" onSave={saveScope('decking_included')} />
                    <EditableInfoRow label="Siding Included" value={!!s?.siding_included} type="boolean" onSave={saveScope('siding_included')} />
                    <EditableInfoRow label="Fascia" value={!!s?.fascia_included} type="boolean" onSave={saveScope('fascia_included')} />
                    <EditableInfoRow label="Soffit" value={!!s?.soffit_included} type="boolean" onSave={saveScope('soffit_included')} />
                    <EditableInfoRow label="Fascia/Soffit Material" value={s?.fascia_soffit_material} type="text" onSave={saveScope('fascia_soffit_material')} />
                    <EditableInfoRow label="Windows" value={!!s?.windows_included} type="boolean" onSave={saveScope('windows_included')} />
                    <EditableInfoRow label="Exterior Doors" value={!!s?.ext_doors_included} type="boolean" onSave={saveScope('ext_doors_included')} />
                    <EditableInfoRow label="WRB / Housewrap" value={!!s?.wrb_included} type="boolean" onSave={saveScope('wrb_included')} />
                    <EditableInfoRow label="Decorative Items" value={!!s?.decorative_included} type="boolean" onSave={saveScope('decorative_included')} />
                  </SectionCard>

                  <SectionCard id="financials" title="Financial Settings" highlight>
                    <EditableInfoRow label="Sales Tax Rate" value={p.sales_tax_rate} type="percent" mono onSave={saveProject('sales_tax_rate')} />
                    <EditableInfoRow label="Tax Jurisdiction" value={p.tax_jurisdiction_label} type="text" onSave={saveProject('tax_jurisdiction_label')} />
                    <EditableInfoRow label="Labor Taxable" value={!!p.labor_taxable} type="boolean" onSave={saveProject('labor_taxable')} />
                    <EditableInfoRow label="Retainage" value={p.retainage_percent} type="percent" mono onSave={saveProject('retainage_percent')} />
                    <EditableInfoRow label="Retainage Release" value={p.retainage_release_trigger} type="text" onSave={saveProject('retainage_release_trigger')} />
                    <EditableInfoRow label="Mobilization" value={!!p.mobilization_enabled} type="boolean" onSave={saveProject('mobilization_enabled')} />
                    <EditableInfoRow label="TC Markup Visibility" value={p.tc_markup_visibility} type="select" options={markupVisOpts} onSave={saveProject('tc_markup_visibility')} />
                  </SectionCard>

                  <SectionCard id="approvals" title="Approvals & Compliance">
                    <EditableInfoRow label="Owner Approval Threshold" value={p.owner_approval_threshold} type="currency" mono onSave={saveProject('owner_approval_threshold')} />
                    <EditableInfoRow label="Owner Approval Email" value={p.owner_approval_email} type="text" onSave={saveProject('owner_approval_email')} />
                    <EditableInfoRow label="Architect Approval Required" value={!!p.architect_approval_required} type="boolean" onSave={saveProject('architect_approval_required')} />
                    <EditableInfoRow label="Architect Approval Email" value={p.architect_approval_email} type="text" onSave={saveProject('architect_approval_email')} />
                    <EditableInfoRow label="Require Photos on Submit" value={!!p.require_photos_on_submit} type="boolean" onSave={saveProject('require_photos_on_submit')} />
                  </SectionCard>

                  <SectionCard id="contracts" title="Contracts" meta={`${(ownerRow ? 1 : 0) + (supplierRow ? 1 : 0) + downstreamRows.length} active`}>
                    {ownerRow && (
                      <EditableInfoRow
                        label={`Owner → ${ownerRow.to_org?.name || 'You'}`}
                        value={ownerRow.contract_sum} type="currency" mono
                        display={<span className="font-mono">{fmt$(ownerRow.contract_sum)}</span>}
                        onSave={saveContract(ownerRow.id, 'contract_sum')}
                        locked={ownerRow.status === 'approved' || ownerRow.status === 'executed'}
                        lockReason="Contract is locked"
                      />
                    )}
                    {supplierRow && (
                      <EditableInfoRow
                        label={`Supplier (${supplierRow.from_org?.name || 'Supplier'})`}
                        value={supplierRow.contract_sum} type="currency" mono
                        display={<span className="font-mono">{fmt$(supplierRow.contract_sum)}</span>}
                        onSave={saveContract(supplierRow.id, 'contract_sum')}
                      />
                    )}
                    {downstreamRows.length === 0 && !ownerRow && !supplierRow && (
                      <p className="text-sm text-muted-foreground py-4 px-3">No contracts recorded.</p>
                    )}
                    {downstreamRows.map((c: any) => (
                      <EditableInfoRow
                        key={c.id}
                        label={`${c.from_org?.name || c.from_role || 'Downstream'} → ${c.to_org?.name || 'You'}`}
                        value={c.contract_sum} type="currency" mono
                        display={<span className="font-mono">{fmt$(c.contract_sum)}</span>}
                        onSave={saveContract(c.id, 'contract_sum')}
                        locked={c.status === 'approved' || c.status === 'executed'}
                        lockReason="Contract is locked"
                      />
                    ))}
                  </SectionCard>

                  {(teamData || []).length > 0 && (
                    <SectionCard id="team" title="Team" meta={`${(teamData || []).length} members`}>
                      {(teamData || []).map((m: any) => (
                        <div key={m.id} className="group flex items-center justify-between px-3 py-2.5 gap-3">
                          <span className="text-muted-foreground text-sm">{m.role || 'Member'}</span>
                          <span className="font-medium text-sm flex items-center gap-2">
                            {m.invited_org_name || '—'}
                            {m.status && (
                              <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                                m.status === 'Accepted' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                              )}>
                                {m.status}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border/40">
                        Manage team members from the Team tab.
                      </p>
                    </SectionCard>
                  )}

                </div>
              </div>
            </div>
          </main>
        </div>
      </ProjectShell>
    );
  }



  return (
    <AppLayout title="Finish Project Setup" fullWidth>
      <div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
        {/* Header + horizontal stepper bar (all breakpoints) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-semibold font-heading truncate">Finish Project Setup</h1>
              <p className="text-[11px] lg:text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Info className="h-3 w-3 shrink-0" />
                <span className="truncate">Step {currentStep + 1} of {activeSteps.length} · {activeSteps[currentStep]?.label}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/project/${projectId}`)}
              disabled={saving}
              className="text-muted-foreground hover:text-destructive h-9 px-2 lg:px-3 shrink-0"
            >
              <X className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Exit</span>
            </Button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {activeSteps.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => { if (index < currentStep) setCurrentStep(index); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] lg:text-xs font-medium whitespace-nowrap border transition-colors shrink-0',
                    active && 'bg-primary text-primary-foreground border-primary',
                    done && !active && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                    !done && !active && 'bg-muted/40 text-muted-foreground border-border',
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' :
                    done ? 'bg-emerald-500 text-white' : 'bg-background text-muted-foreground',
                  )}>
                    {done ? <Check className="h-2.5 w-2.5" /> : index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">{renderStep()}</CardContent>
          <div className="flex items-center justify-between p-4 border-t bg-muted/30 gap-3">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0 || saving} className="min-h-[44px]">
              <ChevronLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            {!isLastStep ? (
              <Button onClick={nextStep} disabled={!canProceed() || saving} className="min-h-[44px]">
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="min-h-[44px]">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finish Setup
              </Button>
            )}
          </div>
        </Card>
      </div>

    </AppLayout>
  );
}

