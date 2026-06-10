import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
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
    const addressLine = [
      addr?.street,
      [p.city, p.state].filter(Boolean).join(', '),
      p.zip,
    ].filter(Boolean).join(' • ');

    const ownerRow = (ctx.contracts || []).find((c: any) => (c.from_role || '').toLowerCase() === 'owner');
    const supplierRow = (ctx.contracts || []).find((c: any) => (c.from_role || '').toLowerCase().includes('supplier'));
    const downstreamRows = (ctx.contracts || []).filter(
      (c: any) => c.to_org_id === currentOrgId && (c.from_role || '').toLowerCase() !== 'owner' && !(c.from_role || '').toLowerCase().includes('supplier'),
    );
    const fmt$ = (n: number | null | undefined) => `$${Number(n || 0).toLocaleString()}`;
    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
      <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-right">{value || <span className="text-muted-foreground">—</span>}</span>
      </div>
    );

    return (
      <ProjectShell projectName={p.name || 'Project'} projectId={projectId!} projectStatus={p.status || 'active'}>
        <div className="flex flex-1 overflow-hidden lg:pr-3 lg:pt-3">
          <ProjectSidebar isSupplier={creatorOrgType === 'Supplier'} isTM={p.contract_mode === 'tm'} />
          <main className="flex-1 overflow-auto lg:ml-[200px] xl:ml-[220px]">
            <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-6 pb-36 lg:pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold font-heading">Project Information</h1>
                  <p className="text-sm text-muted-foreground mt-1">Read-only summary of this project's configuration.</p>
                </div>
              </div>


          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Project</h2>
              <Row label="Name" value={p.name} />
              <Row label="Status" value={<span className="capitalize">{p.status}</span>} />
              <Row label="Contract Mode" value={p.contract_mode === 'tm' ? 'T&M / Remodel' : 'Fixed Price'} />
              <Row label="Project Type" value={p.project_type} />
              <Row label="Build Type" value={p.build_type} />
              <Row label="Address" value={addressLine} />
              <Row label="Start Date" value={p.start_date ? new Date(p.start_date).toLocaleDateString() : null} />
              <Row label="Created" value={p.created_at ? new Date(p.created_at).toLocaleDateString() : null} />
              {p.description && <Row label="Description" value={<span className="whitespace-pre-wrap">{p.description}</span>} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Building Info</h2>
              <Row label="Building Type" value={s?.home_type} />
              <Row label="Stories" value={s?.stories ?? s?.floors} />
              <Row label="Foundation" value={s?.foundation_type} />
              {s?.foundation_type === 'Basement' && (
                <>
                  <Row label="Basement Type" value={s?.basement_type} />
                  <Row label="Basement Finish" value={s?.basement_finish} />
                </>
              )}
              <Row label="Construction Type" value={s?.construction_type || s?.construction_type_other} />
              <Row label="Framing Method" value={s?.framing_method} />
              <Row label="Roof Type" value={s?.roof_type} />
              <Row label="Stairs Type" value={s?.stairs_type} />
              <Row label="# Buildings" value={s?.num_buildings} />
              <Row label="# Units" value={s?.num_units} />
              <Row label="Stories per Unit" value={s?.stories_per_unit} />
              <Row label="Shared Walls" value={typeof s?.has_shared_walls === 'boolean' ? (s.has_shared_walls ? 'Yes' : 'No') : null} />
              <Row label="Bedrooms" value={s?.bedrooms} />
              <Row label="Bathrooms" value={s?.bathrooms} />
              <Row label="Garage" value={s?.garage_type} />
              <Row label="Garage Cars" value={s?.garage_cars} />
              <Row label="Total Sqft" value={s?.total_sqft ? Number(s.total_sqft).toLocaleString() : null} />
              <Row label="Lot Size (acres)" value={s?.lot_size_acres} />
              {s?.scope_description && (
                <Row label="Scope Notes" value={<span className="whitespace-pre-wrap">{s.scope_description}</span>} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Building Features</h2>
              <Row label="Elevator" value={typeof s?.has_elevator === 'boolean' ? (s.has_elevator ? `Yes${s.shaft_type ? ` (${s.shaft_type})` : ''}` : 'No') : null} />
              <Row label="Roof Deck" value={typeof s?.has_roof_deck === 'boolean' ? (s.has_roof_deck ? `Yes${s.roof_deck_type ? ` (${s.roof_deck_type})` : ''}` : 'No') : null} />
              <Row label="Covered Porches" value={typeof s?.has_covered_porches === 'boolean' ? (s.has_covered_porches ? 'Yes' : 'No') : null} />
              <Row label="Balconies" value={typeof s?.has_balconies === 'boolean' ? (s.has_balconies ? `Yes${s.balcony_type ? ` (${s.balcony_type})` : ''}` : 'No') : null} />
              <Row label="Decking" value={s?.decking_included ? (s.decking_type || s.decking_type_other || 'Included') : (s?.decking_included === false ? 'No' : null)} />
              <Row label="Siding" value={s?.siding_included ? (Array.isArray(s.siding_materials) && s.siding_materials.length ? s.siding_materials.join(', ') : (s.siding_material_other || 'Included')) : (s?.siding_included === false ? 'No' : null)} />
              <Row label="Fascia" value={typeof s?.fascia_included === 'boolean' ? (s.fascia_included ? 'Yes' : 'No') : null} />
              <Row label="Soffit" value={typeof s?.soffit_included === 'boolean' ? (s.soffit_included ? 'Yes' : 'No') : null} />
              <Row label="Fascia/Soffit Material" value={s?.fascia_soffit_material || s?.fascia_soffit_material_other} />
              <Row label="Windows" value={typeof s?.windows_included === 'boolean' ? (s.windows_included ? 'Yes' : 'No') : null} />
              <Row label="Exterior Doors" value={typeof s?.ext_doors_included === 'boolean' ? (s.ext_doors_included ? 'Yes' : 'No') : null} />
              <Row label="WRB / Housewrap" value={typeof s?.wrb_included === 'boolean' ? (s.wrb_included ? 'Yes' : 'No') : null} />
              <Row label="Decorative Items" value={s?.decorative_included ? (Array.isArray(s.decorative_items) && s.decorative_items.length ? s.decorative_items.join(', ') : (s.decorative_item_other || 'Included')) : (s?.decorative_included === false ? 'No' : null)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Financial Settings</h2>
              <Row label="Sales Tax Rate" value={p.sales_tax_rate != null ? `${Number(p.sales_tax_rate).toFixed(3)}%` : null} />
              <Row label="Tax Jurisdiction" value={p.tax_jurisdiction_label} />
              <Row label="Labor Taxable" value={typeof p.labor_taxable === 'boolean' ? (p.labor_taxable ? 'Yes' : 'No') : null} />
              <Row label="Retainage" value={p.retainage_percent != null ? `${Number(p.retainage_percent)}%` : null} />
              <Row label="Retainage Release" value={p.retainage_release_trigger} />
              <Row label="Mobilization" value={typeof p.mobilization_enabled === 'boolean' ? (p.mobilization_enabled ? 'Enabled' : 'Disabled') : null} />
              <Row label="TC Markup Visibility" value={p.tc_markup_visibility} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Approvals & Compliance</h2>
              <Row label="Owner Approval Threshold" value={p.owner_approval_threshold != null ? <span className="font-mono">{fmt$(p.owner_approval_threshold)}</span> : null} />
              <Row label="Owner Approval Email" value={p.owner_approval_email} />
              <Row label="Architect Approval" value={typeof p.architect_approval_required === 'boolean' ? (p.architect_approval_required ? 'Required' : 'Not required') : null} />
              <Row label="Architect Approval Email" value={p.architect_approval_email} />
              <Row label="Require Photos on Submit" value={typeof p.require_photos_on_submit === 'boolean' ? (p.require_photos_on_submit ? 'Yes' : 'No') : null} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Contracts</h2>
              {ownerRow && <Row label={`Owner → ${ownerRow.to_org?.name || 'You'}`} value={<span className="font-mono">{fmt$(ownerRow.contract_sum)}</span>} />}
              {supplierRow && <Row label={`Supplier (${supplierRow.from_org?.name || 'Supplier'})`} value={<span className="font-mono">{fmt$(supplierRow.contract_sum)}</span>} />}
              {downstreamRows.length === 0 && !ownerRow && !supplierRow && (
                <p className="text-sm text-muted-foreground py-2">No contracts recorded.</p>
              )}
              {downstreamRows.map((c: any) => (
                <Row
                  key={c.id}
                  label={`${c.from_org?.name || c.from_role || 'Downstream'} → ${c.to_org?.name || 'You'}`}
                  value={<span className="font-mono">{fmt$(c.contract_sum)}</span>}
                />
              ))}
            </CardContent>
          </Card>

          {(teamData || []).length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold font-heading uppercase tracking-wide mb-3">Team</h2>
                {(teamData || []).map((m: any) => (
                  <Row
                    key={m.id}
                    label={m.role || 'Member'}
                    value={
                      <span>
                        {m.invited_org_name || '—'}
                        {m.status && (
                          <span className="ml-2 text-xs text-muted-foreground">({m.status})</span>
                        )}
                      </span>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          )}
            </div>
          </main>
        </div>
      </ProjectShell>
    );
  }


  return (
    <AppLayout title="Finish Project Setup" fullWidth>
      <div className="mx-auto p-6 w-full">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {activeSteps.map((step, index) => (
                    <div
                      key={step.id}
                      onClick={() => { if (index < currentStep) setCurrentStep(index); }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        index === currentStep && "bg-primary/10",
                        index < currentStep && "text-muted-foreground cursor-pointer hover:bg-muted/50",
                        index > currentStep && "cursor-default"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-heading",
                        index <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="hidden md:block">
                        <p className="font-medium text-sm font-heading">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 md:col-span-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold font-heading">Finish Project Setup</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Info className="h-3.5 w-3.5" />
                  This project was started by a supplier. Add the missing pieces to unlock dashboards.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/project/${projectId}`)}
                disabled={saving}
                className="text-muted-foreground hover:text-destructive h-9 px-3"
              >
                <X className="h-4 w-4 mr-1.5" /> Exit
              </Button>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="p-6">{renderStep()}</CardContent>
              <div className="flex items-center justify-between p-4 border-t bg-muted/30">
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
        </div>
      </div>
    </AppLayout>
  );
}
