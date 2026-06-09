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
  { id: 'building_type', label: 'Building Type', description: 'For scope generation' },
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

  // Downstream contracts: those WHERE I am the payer (to_org_id = me).
  // The TeamStep / AddTeamMemberDialog flow auto-creates these rows with contract_sum=0
  // and to_project_team_id linking to the invited member.
  const downstreamContracts: DownstreamContractRow[] = useMemo(() => {
    if (!currentOrgId) return [];
    return (ctx?.contracts || [])
      .filter(c =>
        c.to_org_id === currentOrgId &&
        (c.from_role || '').toLowerCase() !== 'owner' &&
        !(c.from_role || '').toLowerCase().includes('supplier'),
      )
      .map(c => {
        const name = c.from_org?.name
          || (teamData || []).find(t => t.id === c.to_project_team_id)?.invited_org_name
          || 'Pending invite';
        const status = (teamData || []).find(t => t.id === c.to_project_team_id)?.status;
        return {
          id: c.id as string,
          org_name: name,
          role: String(c.from_role || ''),
          trade: c.trade,
          contract_sum: downstreamEdits[c.id as string] ?? Number(c.contract_sum || 0),
          invited_only: status !== 'Accepted',
        };
      });
  }, [ctx?.contracts, teamData, currentOrgId, downstreamEdits]);

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

  // If project doesn't need setup, redirect
  useEffect(() => {
    if (ctx?.project && !ctx.project.setup_completion_required) {
      navigate(`/project/${projectId}`, { replace: true });
    }
  }, [ctx?.project, navigate, projectId]);

  // Fallback: also accept downstream project_team rows in case the contracts row briefly lags.
  const hasDownstreamTeamMember = useMemo(() => {
    if (!downstreamRoleLabel) return false;
    return (teamData || []).some(t => (t.role || '').toLowerCase() === downstreamRoleLabel.toLowerCase());
  }, [teamData, downstreamRoleLabel]);
  const hasInvitedDownstream = downstreamContracts.length > 0 || hasDownstreamTeamMember;

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
        // Every downstream row must have a value > 0
        if (downstreamContracts.length === 0) return false;
        return downstreamContracts.every(r => (r.contract_sum || 0) > 0);
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

  const ensureDownstreamContractRows = useCallback(async () => {
    if (!projectId || !currentOrgId || !user?.id || !downstreamRoleLabel) return;
    const myToRole = isGC ? 'General Contractor' : isTC ? 'Trade Contractor' : null;
    if (!myToRole) return;
    const downstreamMembers = (teamData || []).filter(
      t => (t.role || '').toLowerCase() === downstreamRoleLabel.toLowerCase(),
    );
    const existingTeamIds = new Set(
      (ctx?.contracts || [])
        .filter(c => c.to_org_id === currentOrgId)
        .map(c => c.to_project_team_id)
        .filter(Boolean),
    );
    const missing = downstreamMembers.filter(m => !existingTeamIds.has(m.id));
    if (missing.length === 0) return;
    await supabase.from('project_contracts').insert(
      missing.map(m => ({
        project_id: projectId,
        from_org_id: m.org_id,
        from_role: m.role,
        to_org_id: currentOrgId,
        to_role: myToRole,
        to_project_team_id: m.id,
        contract_sum: 0,
        status: 'Pending',
        created_by_user_id: user.id,
      })),
    );
    await refetchCtx();
  }, [projectId, currentOrgId, user?.id, downstreamRoleLabel, isGC, isTC, teamData, ctx?.contracts, refetchCtx]);

  const nextStep = async () => {
    const stepId = activeSteps[currentStep]?.id;
    if (stepId === 'invite_team' && !selfPerform) {
      await ensureDownstreamContractRows();
    }
    setCurrentStep(p => Math.min(p + 1, activeSteps.length - 1));
  };
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

      // 3. Update downstream contract sums
      for (const [id, sum] of Object.entries(downstreamEdits)) {
        await supabase
          .from('project_contracts')
          .update({ contract_sum: sum })
          .eq('id', id);
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
                onChange={() => {
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
