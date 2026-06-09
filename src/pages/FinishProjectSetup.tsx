import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2, X, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { OrgType } from '@/types/organization';
import { useSetupWizardV2, type BuildingType } from '@/hooks/useSetupWizardV2';

import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
import { ContractsStep } from '@/components/project-wizard-new/ContractsStep';
import { ContractModeSelector, type ContractMode } from '@/components/project-wizard-new/ContractModeSelector';
import { TMBuildingInfoStep, initialTMBuildingInfo, type TMBuildingInfo } from '@/components/project-wizard-new/TMBuildingInfoStep';

interface StepDef { id: string; label: string; description: string; }

const FIXED_STEPS: StepDef[] = [
  { id: 'building_info', label: 'Building Info', description: 'Confirm structure' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'contracts', label: 'Your Contract', description: 'Upstream contract value' },
  { id: 'building_type', label: 'Building Type', description: 'For scope generation' },
  { id: 'scope', label: 'Scope', description: 'Scope & SOV' },
  { id: 'review', label: 'Review', description: 'Finalize' },
];

const TM_STEPS: StepDef[] = [
  { id: 'building_info', label: 'Building Info', description: 'Confirm structure' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'contracts', label: 'Your Contract', description: 'Upstream contract value' },
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

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorOrgType = currentOrg?.type as OrgType | undefined;

  const wizard = useSetupWizardV2(projectId);

  // Load project + scope details + supplier contract
  const { data: ctx, isLoading } = useQuery({
    queryKey: ['finish_setup_ctx', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [proj, scope, contracts] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId!).maybeSingle(),
        supabase.from('project_scope_details').select('*').eq('project_id', projectId!).maybeSingle(),
        supabase.from('project_contracts').select('*').eq('project_id', projectId!),
      ]);
      return { project: proj.data, scope: scope.data, contracts: contracts.data || [] };
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
      sidingMaterials: ctx.scope!.siding_materials || prev.sidingMaterials,
      totalSqft: ctx.scope!.total_sqft || prev.totalSqft,
    }));
  }, [ctx?.scope]);

  const supplierContract = useMemo(
    () => (ctx?.contracts || []).find(c => c.from_role === 'Supplier'),
    [ctx?.contracts]
  );

  const isTM = contractMode === 'tm';
  const isTC = creatorOrgType === 'TC';
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

  const canProceed = (): boolean => {
    const stepId = activeSteps[currentStep]?.id;
    switch (stepId) {
      case 'building_info': return !!(tmScope.buildingType && tmScope.stories >= 1 && tmScope.foundationType);
      case 'mode': return true;
      case 'contracts': {
        const hasGc = typeof wizard.answers.contract_value === 'number' && wizard.answers.contract_value > 0;
        if (isTC) {
          const hasFc = typeof wizard.answers.fc_contract_value === 'number' && wizard.answers.fc_contract_value > 0;
          return hasGc && hasFc;
        }
        return hasGc;
      }
      case 'building_type': return !!wizard.buildingType;
      case 'scope':
      case 'review':
        return true;
      default: return false;
    }
  };

  const nextStep = () => setCurrentStep(p => Math.min(p + 1, activeSteps.length - 1));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));

  const finish = async () => {
    if (!projectId || !currentOrg?.id || !user?.id) return;
    setSaving(true);
    try {
      // Upsert project_scope_details (building info)
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

      // For fixed mode: run full wizard save (creates upstream contract + SOV)
      if (!isTM) {
        await wizard.saveAll(projectId, currentOrg.id, currentOrg.type, user.id);
      }

      // Mark setup complete + update contract_mode / project_type
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
      case 'contracts':
        return (
          <ContractsStep
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            setAnswer={wizard.setAnswer}
            sovLines={wizard.sovLines}
            visibleQuestions={wizard.visibleQuestions}
            creatorOrgType={creatorOrgType}
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
      case 'review':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Ready to finalize</h2>
            <p className="text-sm text-muted-foreground">
              We'll save your building info{!isTM ? ', upstream contract, and generated SOV' : ' and contract'}, then unlock the full dashboard.
            </p>
            {supplierContract && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">Existing supplier contract</p>
                  <p className="text-muted-foreground">
                    ${Number(supplierContract.contract_sum || 0).toLocaleString()} — preserved from the accepted estimate.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );
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
