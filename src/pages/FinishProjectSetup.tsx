import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2, X, Info, Building2, MapPin, Wallet, Layers, FileText, Users, ShieldCheck, Home, CalendarDays, Ruler, CircleCheck, type LucideIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ProjectShell } from '@/components/app-shell/ProjectShell';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { cn } from '@/lib/utils';
import { isInfoCreator, ownInfoContracts, infoContractValue, canEditInfoContract } from '@/lib/projectInfoAccess';
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
  const downstreamRoleLabel = isGC ? 'Subcontractor' : isTC ? 'Crew' : null;

  const wizard = useSetupWizardV2(projectId);

  // Load project + scope details + all contracts + supplier org name
  const { data: ctx, isLoading, refetch: refetchCtx } = useQuery({
    queryKey: ['finish_setup_ctx', projectId, currentOrgId],
    enabled: !!projectId && !!currentOrgId,
    queryFn: async () => {
      if (!projectId) throw new Error('Project required');
      const [proj, scope, contracts] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId ?? '').maybeSingle(),
        supabase.from('project_scope_details').select('*').eq('project_id', projectId ?? '').maybeSingle(),
        supabase
          .from('project_contracts')
          .select('*, from_org:from_org_id(id,name), to_org:to_org_id(id,name)')
          .eq('project_id', projectId)
          .or(`from_org_id.eq.${currentOrgId},to_org_id.eq.${currentOrgId}`),
      ]);
      if (proj.error) throw proj.error;
      if (scope.error) throw scope.error;
      if (contracts.error) throw contracts.error;
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
        .eq('project_id', projectId ?? '');
      return data || [];
    },
  });

  // Prefill TM building info from project_scope_details
  useEffect(() => {
    if (!ctx?.scope) return;
    const scope = ctx.scope;
    setTmScope(prev => ({
      ...prev,
      buildingType: scope.home_type || prev.buildingType,
      stories: scope.stories || scope.floors || prev.stories,
      foundationType: (scope.foundation_type as any) || prev.foundationType,
      basementType: (scope.basement_type as any) || prev.basementType,
      basementFinish: (scope.basement_finish as any) || prev.basementFinish,
      garageType: (scope.garage_type as any) || prev.garageType,
      sidingIncluded: scope.siding_included ?? prev.sidingIncluded,
      sidingMaterials: Array.isArray(scope.siding_materials) ? (scope.siding_materials as string[]) : prev.sidingMaterials,
      totalSqft: scope.total_sqft || prev.totalSqft,
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

  const canEditProjectInfo = isInfoCreator(ctx?.project?.created_by, user?.id);

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
    if (!projectId || !currentOrgId || !user?.id || !canEditProjectInfo) return;
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
      const myToRole = isGC ? 'General Contractor' : isTC ? 'Subcontractor' : null;
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
                  ? 'Add the subcontractors who will work on this project. You\'ll enter what you\'re paying each one on the next step.'
                  : 'Add the crews who will work for you on this project. You\'ll enter what you\'re paying each one on the next step.'}
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
  if ((isActiveProject || !canEditProjectInfo) && ctx?.project) {
    const p = ctx.project as any;
    const s = ctx.scope as any | null;
    const addr = (p.address && typeof p.address === 'object') ? p.address : null;

    const visibleContracts = ownInfoContracts(ctx.contracts, currentOrgId);
    const fmt$ = (n: number | null | undefined) => `$${Number(n || 0).toLocaleString()}`;

    const invalidate = () => qc.invalidateQueries({ queryKey: ['finish_setup_ctx', projectId, currentOrgId] });

    const saveProject = (field: string) => async (val: any) => {
      if (!canEditProjectInfo) throw new Error('Only the project creator can edit project information');
      const { error } = await supabase.from('projects').update({ [field]: val }).eq('id', projectId ?? '');
      if (error) throw error;
      invalidate();
    };
    const saveAddress = (field: 'street' | 'city' | 'state' | 'zip') => async (val: any) => {
      if (!canEditProjectInfo) throw new Error('Only the project creator can edit project information');
      if (field === 'city' || field === 'state' || field === 'zip') {
        if (!canEditProjectInfo) throw new Error('Only the project creator can edit project information');
      const { error } = await supabase.from('projects').update({ [field]: val }).eq('id', projectId ?? '');
        if (error) throw error;
      } else {
        const next = { ...(addr || {}), street: val };
        const { error } = await supabase.from('projects').update({ address: next }).eq('id', projectId ?? '');
        if (error) throw error;
      }
      invalidate();
    };
    const saveScope = (field: string) => async (val: any) => {
      if (!canEditProjectInfo) throw new Error('Only the project creator can edit building information');
      if (!s) {
        const { error } = await supabase.from('project_scope_details').insert({ project_id: projectId ?? '', [field]: val } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_scope_details').update({ [field]: val }).eq('project_id', projectId ?? '');
        if (error) throw error;
      }
      invalidate();
    };
    const saveContract = (id: string, field: string) => async (val: any) => {
      const contract = visibleContracts.find(c => c.id === id);
      if (!contract || !canEditInfoContract(contract, user?.id)) throw new Error('Only the contract creator can edit an unlocked contract');
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

    const has = (v: any) => v !== null && v !== undefined && v !== '' && v !== 0;
    const F = (filled: boolean, node: React.ReactElement) => ({ filled, node: React.cloneElement(node, { locked: !canEditProjectInfo, lockReason: 'Only the project creator can edit project information' }) });
    const prettify = (v?: string | null) => (v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null);
    const team = (teamData || []) as any[];
    const contractTotal = infoContractValue(visibleContracts, currentOrgId, creatorOrgType);
    const location = [addr?.street, p.city, p.state, p.zip].filter(Boolean).join(', ');

    const detailFields = [
      F(has(p.name), <EditableInfoRow label="Name" value={p.name} type="text" onSave={saveProject('name')} />),
      F(has(p.status), <EditableInfoRow label="Status" value={p.status} type="select" options={statusOpts} onSave={saveProject('status')} />),
      F(true, <EditableInfoRow label="Contract Mode" value={p.contract_mode || 'fixed'} type="select" options={contractModeOpts} onSave={saveProject('contract_mode')} />),
      F(has(p.project_type), <EditableInfoRow label="Project Type" value={p.project_type} type="select" options={projectTypeOpts} onSave={saveProject('project_type')} />),
      F(has(p.build_type), <EditableInfoRow label="Build Type" value={p.build_type} type="select" options={buildTypeOpts} onSave={saveProject('build_type')} />),
      F(has(p.start_date), <EditableInfoRow label="Start Date" value={p.start_date} type="date" onSave={saveProject('start_date')} />),
      F(has(addr?.street), <EditableInfoRow label="Street" value={addr?.street ?? ''} type="text" onSave={saveAddress('street')} placeholder="123 Main St" />),
      F(has(p.city), <EditableInfoRow label="City" value={p.city} type="text" onSave={saveAddress('city')} />),
      F(has(p.state), <EditableInfoRow label="State" value={p.state} type="text" onSave={saveAddress('state')} />),
      F(has(p.zip), <EditableInfoRow label="Zip" value={p.zip} type="text" onSave={saveAddress('zip')} />),
      F(has(p.description), <EditableInfoRow label="Description" value={p.description} type="text" onSave={saveProject('description')} />),
    ];

    const buildingFields = [
      F(has(s?.home_type), <EditableInfoRow label="Building Type" value={s?.home_type} type="select" options={homeTypeOpts} onSave={saveScope('home_type')} />),
      F(has(s?.stories ?? s?.floors), <EditableInfoRow label="Stories" value={s?.stories ?? s?.floors} type="number" onSave={saveScope('stories')} />),
      F(has(s?.total_sqft), <EditableInfoRow label="Total Sqft" value={s?.total_sqft} type="number" mono onSave={saveScope('total_sqft')} />),
      F(has(s?.foundation_type), <EditableInfoRow label="Foundation" value={s?.foundation_type} type="select" options={foundationOpts} onSave={saveScope('foundation_type')} />),
      ...(s?.foundation_type === 'Basement' ? [
        F(has(s?.basement_type), <EditableInfoRow label="Basement Type" value={s?.basement_type} type="text" onSave={saveScope('basement_type')} />),
        F(has(s?.basement_finish), <EditableInfoRow label="Basement Finish" value={s?.basement_finish} type="text" onSave={saveScope('basement_finish')} />),
      ] : []),
      F(has(s?.construction_type), <EditableInfoRow label="Construction" value={s?.construction_type} type="text" onSave={saveScope('construction_type')} />),
      F(has(s?.framing_method), <EditableInfoRow label="Framing" value={s?.framing_method} type="text" onSave={saveScope('framing_method')} />),
      F(has(s?.roof_type), <EditableInfoRow label="Roof Type" value={s?.roof_type} type="text" onSave={saveScope('roof_type')} />),
      F(has(s?.stairs_type), <EditableInfoRow label="Stairs" value={s?.stairs_type} type="text" onSave={saveScope('stairs_type')} />),
      F(has(s?.num_buildings), <EditableInfoRow label="# Buildings" value={s?.num_buildings} type="number" onSave={saveScope('num_buildings')} />),
      F(has(s?.num_units), <EditableInfoRow label="# Units" value={s?.num_units} type="number" onSave={saveScope('num_units')} />),
      F(has(s?.stories_per_unit), <EditableInfoRow label="Stories / Unit" value={s?.stories_per_unit} type="number" onSave={saveScope('stories_per_unit')} />),
      F(!!s?.has_shared_walls, <EditableInfoRow label="Shared Walls" value={!!s?.has_shared_walls} type="boolean" onSave={saveScope('has_shared_walls')} />),
      F(has(s?.bedrooms), <EditableInfoRow label="Bedrooms" value={s?.bedrooms} type="number" onSave={saveScope('bedrooms')} />),
      F(has(s?.bathrooms), <EditableInfoRow label="Bathrooms" value={s?.bathrooms} type="number" onSave={saveScope('bathrooms')} />),
      F(has(s?.garage_type), <EditableInfoRow label="Garage" value={s?.garage_type} type="select" options={garageOpts} onSave={saveScope('garage_type')} />),
      F(has(s?.garage_cars), <EditableInfoRow label="Garage Cars" value={s?.garage_cars} type="number" onSave={saveScope('garage_cars')} />),
      F(has(s?.lot_size_acres), <EditableInfoRow label="Lot (acres)" value={s?.lot_size_acres} type="number" onSave={saveScope('lot_size_acres')} />),
      F(has(s?.scope_description), <EditableInfoRow label="Scope Notes" value={s?.scope_description} type="text" onSave={saveScope('scope_description')} />),
    ];

    const features: { key: string; label: string }[] = [
      { key: 'has_elevator', label: 'Elevator' }, { key: 'has_roof_deck', label: 'Roof Deck' },
      { key: 'has_covered_porches', label: 'Covered Porches' }, { key: 'has_balconies', label: 'Balconies' },
      { key: 'decking_included', label: 'Decking' }, { key: 'siding_included', label: 'Siding' },
      { key: 'fascia_included', label: 'Fascia' }, { key: 'soffit_included', label: 'Soffit' },
      { key: 'windows_included', label: 'Windows' }, { key: 'ext_doors_included', label: 'Exterior Doors' },
      { key: 'wrb_included', label: 'WRB / Housewrap' }, { key: 'decorative_included', label: 'Decorative' },
    ];
    const featuresOn = features.filter(f => !!s?.[f.key]).length;

    const financialFields = [
      F(true, <EditableInfoRow label="Sales Tax" value={p.sales_tax_rate} type="percent" mono onSave={saveProject('sales_tax_rate')} />),
      F(has(p.tax_jurisdiction_label), <EditableInfoRow label="Tax Jurisdiction" value={p.tax_jurisdiction_label} type="text" onSave={saveProject('tax_jurisdiction_label')} />),
      F(true, <EditableInfoRow label="Labor Taxable" value={!!p.labor_taxable} type="boolean" onSave={saveProject('labor_taxable')} />),
      ...(isGC ? [F(true, <EditableInfoRow label="Retainage" value={p.retainage_percent} type="percent" mono onSave={saveProject('retainage_percent')} />),
      F(has(p.retainage_release_trigger), <EditableInfoRow label="Retainage Release" value={p.retainage_release_trigger} type="text" onSave={saveProject('retainage_release_trigger')} />),
      F(true, <EditableInfoRow label="Mobilization" value={!!p.mobilization_enabled} type="boolean" onSave={saveProject('mobilization_enabled')} />),
      F(true, <EditableInfoRow label="Markup Visibility" value={p.tc_markup_visibility} type="select" options={markupVisOpts} onSave={saveProject('tc_markup_visibility')} />)] : []),
    ];

    const approvalFields = [
      F(has(p.owner_approval_threshold), <EditableInfoRow label="Owner Threshold" value={p.owner_approval_threshold} type="currency" mono onSave={saveProject('owner_approval_threshold')} />),
      F(has(p.owner_approval_email), <EditableInfoRow label="Owner Email" value={p.owner_approval_email} type="text" onSave={saveProject('owner_approval_email')} />),
      F(true, <EditableInfoRow label="Architect Approval" value={!!p.architect_approval_required} type="boolean" onSave={saveProject('architect_approval_required')} />),
      F(has(p.architect_approval_email), <EditableInfoRow label="Architect Email" value={p.architect_approval_email} type="text" onSave={saveProject('architect_approval_email')} />),
      F(true, <EditableInfoRow label="Photos on Submit" value={!!p.require_photos_on_submit} type="boolean" onSave={saveProject('require_photos_on_submit')} />),
    ];

    const allFields = [...detailFields, ...buildingFields, ...financialFields, ...(isGC ? approvalFields : [])];
    const completeness = Math.round((allFields.filter(f => f.filled).length / allFields.length) * 100);

    const stats: { label: string; value: string; mono?: boolean }[] = [
      { label: isGC ? 'Owner contract' : creatorOrgType === 'SUPPLIER' ? 'Supply contract' : 'Your contract', value: contractTotal !== null ? fmt$(contractTotal) : '—', mono: true },
      { label: 'Building', value: [prettify(s?.home_type), (s?.stories ?? s?.floors) ? `${s?.stories ?? s?.floors} story` : null].filter(Boolean).join(' · ') || '—' },
      { label: 'Size', value: s?.total_sqft ? `${Number(s.total_sqft).toLocaleString()} sq ft` : '—', mono: true },
      { label: 'Start', value: p.start_date ? new Date(p.start_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
      { label: 'Team', value: `${team.length} ${team.length === 1 ? 'company' : 'companies'}` },
      { label: 'Info complete', value: `${completeness}%`, mono: true },
    ];
    const statIcons = [Wallet, Home, Ruler, CalendarDays, Users, CircleCheck];

    return (
      <ProjectShell projectName={p.name || 'Project'} projectId={projectId ?? ''} projectStatus={p.status || 'active'}>
        <div className="flex flex-1 overflow-hidden lg:pr-3 lg:pt-3">
          <ProjectSidebar isSupplier={creatorOrgType === 'SUPPLIER'} isTM={p.contract_mode === 'tm'} />
          <main className="flex-1 min-w-0 overflow-auto lg:ml-[200px] xl:ml-[220px]">
            <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-36 lg:pb-12 space-y-4">

              {/* Header + snapshot */}
              <div className="bg-command text-command-foreground rounded-2xl border border-command-border shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" className="lg:hidden shrink-0 h-10 w-10 -ml-2 text-command-foreground hover:bg-command-foreground/10 hover:text-command-foreground">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-normal text-command-muted">Project Information</p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-full">
                    <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-normal break-words [overflow-wrap:anywhere]">{p.name || 'Project'}</h1>
                    <p className="text-sm text-command-muted mt-1 flex items-start gap-1.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="min-w-0 break-words">{location || 'No address yet'}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[prettify(p.status), p.contract_mode === 'tm' ? 'T&M / Remodel' : 'Fixed Price', prettify(p.project_type), prettify(p.build_type)].filter(Boolean).map(t => (
                      <span key={t as string} className={cn('max-w-full break-words text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-normal border', t === prettify(p.status) ? 'bg-state-approved-bg text-state-approved border-state-approved/30' : 'bg-command-foreground/10 text-command-foreground border-command-border')}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {stats.map((st, index) => {
                    const Icon = statIcons[index] ?? Info;
                    return (
                    <div key={st.label} className="border-t border-command-border px-1 py-2 min-w-0">
                      <Icon className={cn('h-4 w-4 mb-2', index === 0 ? 'text-state-approved' : index === 5 ? 'text-type-change' : 'text-command-muted')} />
                      <p className="text-[10px] font-semibold uppercase tracking-normal text-command-muted">{st.label}</p>
                      <p className={cn('text-sm font-semibold text-command-foreground break-words [overflow-wrap:anywhere]', st.mono && 'font-mono')}>{st.value}</p>
                    </div>
                  );})}
                </div>
                <p className="text-[11px] text-command-muted mt-3">{canEditProjectInfo ? 'Project creator' : 'Read-only · Project details are managed by the creator'}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InfoCard canEdit={canEditProjectInfo} id="project-details" title="Project Details" fields={detailFields} icon={Building2} accent="text-type-project bg-type-project/10" />

                <InfoCard canEdit={canEditProjectInfo} id="financials" title="Financial Settings" fields={financialFields} icon={Wallet} accent="text-state-approved bg-state-approved/10" />

                <InfoCard canEdit={canEditProjectInfo} id="building-info" title="Building Info" fields={buildingFields} className="lg:col-span-2" twoCol icon={Home} accent="text-type-change bg-type-change/10" />

                <section id="building-features" className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden lg:col-span-2">
                  <InfoSectionHeading title="Building Features" icon={Layers} accent="text-type-change bg-type-change/10" count={`${featuresOn} of ${features.length} included`} />
                  <div className="p-4 flex flex-wrap gap-2">
                    {features.map(f => {
                      const on = !!s?.[f.key];
                      return (
                        <Button
                          variant="outline"
                          disabled={!canEditProjectInfo}
                          key={f.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => saveScope(f.key)(!on).catch((err: Error) => toast({ title: 'Could not save', description: err.message, variant: 'destructive' }))}
                          className={cn(
                            'inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-sm font-medium transition-colors',
                            on ? 'bg-state-approved-bg text-state-approved border-state-approved/30 disabled:opacity-100' : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground disabled:opacity-100',
                          )}
                        >
                          {on ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-current shrink-0" />}
                          {f.label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="px-4 pb-3">
                    <EditableInfoRow locked={!canEditProjectInfo} lockReason="Only the project creator can edit building information" label="Fascia/Soffit Material" value={s?.fascia_soffit_material} type="text" onSave={saveScope('fascia_soffit_material')} />
                  </div>
                </section>

                <section id="contracts" className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <InfoSectionHeading title="Contracts" icon={FileText} accent="text-state-approved bg-state-approved/10" count={`${visibleContracts.length} agreements`} />
                  <div className="divide-y divide-border/40 px-1">
                    {visibleContracts.map(c => (
                      <div key={c.id}>
                        <EditableInfoRow label={`${c.from_org?.name || c.from_role} → ${c.to_org?.name || c.to_role}`}
                          value={c.contract_sum} type="currency" mono
                          display={<span className="font-mono">{fmt$(c.contract_sum)}</span>}
                          onSave={saveContract(c.id, 'contract_sum')}
                          locked={!canEditInfoContract(c, user?.id)} lockReason="Only the contract creator can edit an unlocked agreement" />
                        <EditableInfoRow label="Retainage" value={c.retainage_percent} type="percent" mono
                          onSave={saveContract(c.id, 'retainage_percent')}
                          locked={!canEditInfoContract(c, user?.id)} lockReason="Only the contract creator can edit an unlocked agreement" />
                      </div>
                    ))}
                    {visibleContracts.length === 0 && <p className="text-sm text-muted-foreground py-4 px-3">No agreements recorded for your company.</p>}
                  </div>
                </section>

                {isGC && <InfoCard canEdit={canEditProjectInfo} id="approvals" title="Approvals & Compliance" fields={approvalFields} icon={ShieldCheck} accent="text-type-change bg-type-change/10" />}

                {team.length > 0 && (
                  <section id="team" className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden lg:col-span-2">
                    <InfoSectionHeading title="Team" icon={Users} accent="text-type-sov bg-type-sov/10" count={`${team.length} members`} />
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {team.map((m: any) => (
                        <div key={m.id} className="rounded-xl border border-border/60 px-3 py-2 min-w-0">
                          <p className="text-sm font-semibold text-foreground break-words">{m.invited_org_name || '—'}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{m.role || 'Member'}</span>
                            {m.status && (
                              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                                m.status === 'Accepted' ? 'bg-state-approved-bg text-state-approved' : 'bg-muted text-muted-foreground')}>{m.status}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground px-4 pb-3">Manage team members from the Team tab.</p>
                  </section>
                )}
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
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project/${projectId}`)}
              disabled={saving}
              className="h-9 px-3 shrink-0 hover:text-destructive hover:border-destructive"
            >
              <X className="h-4 w-4 mr-1.5" /> Exit Setup
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

function InfoSectionHeading({ title, icon: Icon, accent, count }: { title: string; icon: LucideIcon; accent: string; count: string }) {
  return (
    <div className="px-4 py-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent)}><Icon className="h-4 w-4" /></span>
        <h2 className="text-base font-bold tracking-normal uppercase font-heading break-words">{title}</h2>
      </div>
      <span className="text-[10px] font-semibold px-2 py-1 rounded-md tracking-normal bg-muted/50 text-muted-foreground max-w-full">{count}</span>
    </div>
  );
}

function InfoCard({ id, title, fields, className, twoCol, canEdit = false, icon = Info, accent = 'text-primary bg-primary/10' }: {
  id: string;
  title: string;
  fields: { filled: boolean; node: React.ReactNode }[];
  className?: string;
  twoCol?: boolean;
  canEdit?: boolean;
  icon?: LucideIcon;
  accent?: string;
}) {
  const [showEmpty, setShowEmpty] = useState(false);
  const filled = fields.filter(f => f.filled);
  const empty = fields.filter(f => !f.filled);
  const visible = showEmpty ? fields : filled;
  return (
    <section id={id} className={cn('scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden', className)}>
      <InfoSectionHeading title={title} icon={icon} accent={accent} count={`${filled.length}/${fields.length} filled`} />
      <div className={cn('px-1', twoCol ? 'grid grid-cols-1 md:grid-cols-2 md:gap-x-6' : '')}>
        {visible.map((f, i) => (
          <div key={i} className="border-b border-border/40 min-w-0">{f.node}</div>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted-foreground px-3 py-3">Nothing entered yet.</p>}
      </div>
      {empty.length > 0 && (
        <Button
          variant="ghost"
          type="button"
          onClick={() => setShowEmpty(v => !v)}
          className="w-full min-h-[40px] px-4 text-left text-xs font-semibold text-primary hover:bg-muted/40"
        >
          {showEmpty ? 'Hide empty fields' : `${canEdit ? '+ Add missing info' : 'Show missing info'} (${empty.length})`}
        </Button>
      )}
    </section>
  );
}
