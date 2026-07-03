import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { ProjectBasics, TeamMember } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { useSetupWizardV2, type BuildingType, type Answers } from '@/hooks/useSetupWizardV2';

import { BasicsStepNew } from '@/components/project-wizard-new/BasicsStep';
import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
import { ContractsStep } from '@/components/project-wizard-new/ContractsStep';
import { UnifiedReviewStep } from '@/components/project-wizard-new/UnifiedReviewStep';
import { ContractModeSelector, type ContractMode } from '@/components/project-wizard-new/ContractModeSelector';
import { TMBuildingInfoStep, initialTMBuildingInfo, type TMBuildingInfo } from '@/components/project-wizard-new/TMBuildingInfoStep';

interface StepDef {
  id: string;
  label: string;
  description: string;
}

const FIXED_STEPS: StepDef[] = [
  { id: 'basics', label: 'Project Basics', description: 'Name, location & team' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'contracts', label: 'Contracts', description: 'Contract values' },
  { id: 'building_type', label: 'Building Type', description: 'What are you building?' },
  { id: 'scope', label: 'Scope', description: 'Scope & live SOV' },
  { id: 'review', label: 'Review', description: 'Review and create' },
];

const TM_STEPS: StepDef[] = [
  { id: 'basics', label: 'Project Basics', description: 'Name, location & team' },
  { id: 'mode', label: 'Contract Mode', description: 'Fixed or T&M' },
  { id: 'building_info', label: 'Building Info', description: 'Building details for WOs' },
  { id: 'review', label: 'Review', description: 'Review and create' },
];

const SUPPLIER_STEPS: StepDef[] = [
  { id: 'basics', label: 'Project Basics', description: 'Name, location & team' },
  { id: 'building_info', label: 'Building Info', description: 'Structure & size' },
  { id: 'review', label: 'Review', description: 'Review and create' },
];

const initialBasics: ProjectBasics = {
  name: '',
  projectType: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

const DRAFT_KEY = 'project_wizard_draft';

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function CreateProjectNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, profile, loading: authLoading } = useAuth();

  const draft = useRef(loadDraft()).current;

  const [currentStep, setCurrentStep] = useState(draft?.currentStep ?? 0);
  const [basics, setBasics] = useState<ProjectBasics>(draft?.basics ?? initialBasics);
  const [team, setTeam] = useState<TeamMember[]>(draft?.team ?? []);
  const [saving, setSaving] = useState(false);
  const [contractMode, setContractMode] = useState<ContractMode>(draft?.contractMode ?? 'fixed');
  const [tmScope, setTmScope] = useState<TMBuildingInfo>(draft?.tmScope ?? initialTMBuildingInfo);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [otherProjectLabel, setOtherProjectLabel] = useState<string | null>(draft?.otherProjectLabel ?? null);

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorOrgType = currentOrg?.type as OrgType | undefined;
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' : 
                      currentOrg?.type === 'TC' ? 'Trade Contractor' :
                      currentOrg?.type === 'SUPPLIER' ? 'Supplier' : null;

  const wizard = useSetupWizardV2(
    undefined,
    draft?.wizardAnswers as Answers | undefined,
    (draft?.wizardBuildingType as BuildingType) ?? null,
  );

  // Persist draft to sessionStorage on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          currentStep,
          basics,
          team,
          contractMode,
          tmScope,
          wizardAnswers: wizard.answers,
          wizardBuildingType: wizard.buildingType,
          otherProjectLabel,
        }));
      } catch { /* quota exceeded — ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentStep, basics, team, contractMode, tmScope, wizard.answers, wizard.buildingType, otherProjectLabel]);

  const isTM = contractMode === 'tm';
  const isSupplier = creatorOrgType === 'SUPPLIER';
  const activeSteps = useMemo(() => {
    if (isSupplier) return SUPPLIER_STEPS;
    return isTM ? TM_STEPS : FIXED_STEPS;
  }, [isTM, isSupplier]);

  // Clamp draft-restored step if it now points past the filtered step list
  useEffect(() => {
    if (currentStep > activeSteps.length - 1) {
      setCurrentStep(Math.max(0, activeSteps.length - 1));
    }
  }, [activeSteps.length, currentStep]);

  useEffect(() => {
    if (!authLoading && (!user || !currentOrg)) {
      navigate('/dashboard');
    }
  }, [authLoading, user, currentOrg, navigate]);

  const updateBasics = (updates: Partial<ProjectBasics>) => {
    setBasics(prev => ({ ...prev, ...updates }));
  };

  const isTC = creatorOrgType === 'TC';

  // Map step id to validation
  const canProceed = (): boolean => {
    const stepId = activeSteps[currentStep]?.id;
    switch (stepId) {
      case 'basics': return !!(basics.name && basics.address && basics.city && basics.state && basics.zip);
      case 'mode': return true;
      case 'building_info': return !!(tmScope.buildingType && tmScope.stories >= 1 && tmScope.foundationType);
      case 'contracts': {
        const hasGcContract = typeof wizard.answers.contract_value === 'number' && wizard.answers.contract_value > 0;
        if (isTC) {
          const hasFcContract = typeof wizard.answers.fc_contract_value === 'number' && wizard.answers.fc_contract_value > 0;
          return hasGcContract && hasFcContract;
        }
        return hasGcContract;
      }
      case 'building_type': return !!wizard.buildingType;
      case 'scope': return true;
      case 'review': return true;
      default: return false;
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, activeSteps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // When switching contract mode on the mode step, reset step to mode step
  const handleModeChange = (mode: ContractMode) => {
    setContractMode(mode);
    // Keep on mode step — user clicks Next to proceed
  };

  const handleCancel = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setShowCancelDialog(false);
    navigate('/dashboard');
  };

  const createProject = async () => {
    if (!currentOrg?.id || !user?.id) {
      toast({ title: 'Error', description: 'Organization not found', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: basics.name,
          project_type: isSupplier ? (tmScope.buildingType || '') : (isTM ? 'Remodel / T&M' : (otherProjectLabel || wizard.buildingType || '')),
          address: { street: basics.address } as any,
          city: basics.city,
          state: basics.state,
          zip: basics.zip,
          start_date: basics.startDate || null,
          created_by: user.id,
          created_by_org_id: currentOrg.id,
          organization_id: currentOrg.id,
          status: (isTM || isSupplier) ? 'active' : 'setup',
          contract_mode: contractMode,
        })
        .select('id')
        .single();

      if (projErr) throw projErr;
      const pid = project.id;

      const roleLabel = currentOrg.type === 'GC' ? 'General Contractor'
        : currentOrg.type === 'TC' ? 'Trade Contractor'
        : currentOrg.type === 'FC' ? 'Field Crew'
        : 'Supplier';

      await Promise.all([
        supabase.from('project_participants').insert({
          project_id: pid,
          organization_id: currentOrg.id,
          role: currentOrg.type as any,
          invite_status: 'ACCEPTED',
          invited_by: user.id,
        }),
        supabase.from('project_team').insert({
          project_id: pid,
          org_id: currentOrg.id,
          user_id: user.id,
          role: roleLabel,
          trade: currentOrg.type === 'TC' || currentOrg.type === 'FC' ? (currentOrg as any).trade : null,
          invited_email: profile?.email || '',
          invited_name: profile?.full_name || profile?.first_name || '',
          invited_org_name: currentOrg.name,
          invited_by_user_id: user.id,
          status: 'Accepted',
          accepted_at: new Date().toISOString(),
        }),
      ]);

      // Save wizard answers + contract(s) + SOV(s) — skip for T&M and Supplier
      if (isSupplier || isTM) {
        // Save building info to project_scope_details
        const { error: scopeErr } = await supabase.from('project_scope_details').insert({
          project_id: pid,
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
        });
        if (scopeErr) {
          console.error('Failed to save scope details:', scopeErr);
          toast({ title: 'Project created', description: 'Building info could not be saved. You can update it later.', variant: 'destructive' });
        }
      } else {
        await wizard.saveAll(pid, currentOrg.id, currentOrg.type, user.id);
      }

      // Save team members
      for (const member of team) {
        try {
          const { data: teamMember, error: teamErr } = await supabase
            .from('project_team')
            .insert({
              project_id: pid,
              org_id: member.orgId || null,
              user_id: member.userId || null,
              role: member.role,
              trade: member.trade,
              trade_custom: member.tradeCustom,
              invited_email: member.contactEmail,
              invited_name: member.contactName,
              invited_org_name: member.companyName,
              invited_by_user_id: user.id,
              status: 'Invited',
            })
            .select('id')
            .single();

          if (teamErr) throw teamErr;

          await supabase.from('project_invites').insert({
            project_id: pid,
            project_team_id: teamMember.id,
            role: member.role,
            trade: member.trade,
            trade_custom: member.tradeCustom,
            invited_email: member.contactEmail,
            invited_name: member.contactName,
            invited_org_name: member.companyName,
            invited_by_user_id: user.id,
          });
        } catch (err: any) {
          console.error('Error saving team member:', err);
        }
      }

      sessionStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Project created!', description: isTM ? 'Your T&M project is ready. Add Work Orders to get started.' : 'Invitations will be sent to team members.' });
      navigate(`/project/${pid}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    const stepId = activeSteps[currentStep]?.id;
    switch (stepId) {
      case 'basics':
        return (
          <BasicsStepNew
            data={basics}
            onChange={updateBasics}
            team={team}
            onTeamChange={setTeam}
            creatorOrgName={currentOrg?.name}
            creatorRole={creatorRole}
            creatorOrgType={creatorOrgType}
          />
        );
      case 'mode':
        return (
          <ContractModeSelector
            selected={contractMode}
            onSelect={handleModeChange}
          />
        );
      case 'building_info':
        return (
          <TMBuildingInfoStep
            data={tmScope}
            onChange={(updates) => setTmScope(prev => ({ ...prev, ...updates }))}
            hideMaterialResponsibility={isSupplier}
            title={isSupplier ? 'Project Structure' : undefined}
            description={isSupplier ? 'Tell us about the building so you can scope materials. You\'ll send an estimate to the GC or TC handling materials later — that becomes the contract.' : undefined}
          />
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
          />
        );
      case 'building_type':
        return (
          <BuildingTypeSelector
            selected={wizard.buildingType}
            onSelect={(bt) => wizard.selectBuildingType(bt)}
            otherLabel={otherProjectLabel}
            onOtherLabelChange={setOtherProjectLabel}
          />
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
          <p className="text-sm text-muted-foreground py-8 text-center">
            Please go back and select a building type first.
          </p>
        );
      case 'review':
        return (
          <UnifiedReviewStep
            basics={basics}
            buildingType={(isTM || isSupplier) ? null : wizard.buildingType}
            answers={(isTM || isSupplier) ? {} : wizard.answers}
            visibleQuestions={(isTM || isSupplier) ? [] : wizard.visibleQuestions}
            sovLines={(isTM || isSupplier) ? [] : wizard.sovLines}
            team={team}
            creatorOrgName={currentOrg?.name}
            creatorRole={creatorRole}
            creatorOrgType={creatorOrgType}
            contractMode={contractMode}
            tmBuildingInfo={(isTM || isSupplier) ? tmScope : undefined}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <AppLayout title="Create Project">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isLastStep = currentStep === activeSteps.length - 1;

  const currentStepDef = activeSteps[currentStep];
  const progressPct = Math.round(((currentStep + 1) / activeSteps.length) * 100);

  return (
    <AppLayout title="Create New Project" fullWidth>
      <div className="mx-auto p-4 sm:p-6 w-full">
        {/* Compact horizontal stepper — visible below lg */}
        <div className="lg:hidden mb-4">
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-heading">
                    Step {currentStep + 1} of {activeSteps.length}
                  </p>
                  <p className="font-heading font-semibold text-sm sm:text-base truncate">
                    {currentStepDef?.label}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground shrink-0">{progressPct}%</span>
              </div>

              {/* Slim progress track */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Dot row — tappable, no wrapping labels */}
              <div className="flex items-center justify-between gap-1">
                {activeSteps.map((step, index) => {
                  const done = index < currentStep;
                  const active = index === currentStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => { if (done) setCurrentStep(index); }}
                      disabled={!done && !active}
                      aria-label={`${step.label} (${index + 1} of ${activeSteps.length})`}
                      aria-current={active ? 'step' : undefined}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 min-w-0",
                        done ? "cursor-pointer" : "cursor-default",
                      )}
                    >
                      <span className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold font-heading transition-colors",
                        active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                        done && "bg-primary text-primary-foreground",
                        !active && !done && "bg-muted text-muted-foreground",
                      )}>
                        {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Vertical sidebar — only at lg+ where there's room for label + description */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-2">
            <Card className="sticky top-4">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {activeSteps.map((step, index) => {
                    const done = index < currentStep;
                    const active = index === currentStep;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => { if (done) setCurrentStep(index); }}
                        disabled={!done && !active}
                        aria-current={active ? 'step' : undefined}
                        className={cn(
                          "w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left",
                          active && "bg-primary/10",
                          done && "hover:bg-muted/60 cursor-pointer",
                          !active && !done && "opacity-60 cursor-default",
                        )}
                      >
                        <span className={cn(
                          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-heading",
                          (done || active) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}>
                          {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span className="block font-medium text-sm font-heading leading-tight">{step.label}</span>
                          <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{step.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <div className="col-span-12 lg:col-span-9 xl:col-span-10">

            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold font-heading">New Project</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={saving}
                className="text-muted-foreground hover:text-destructive h-9 px-3"
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                {renderStep()}
              </CardContent>

              <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0 || saving}
                  className="min-h-[44px]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {!isLastStep ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed() || saving}
                    className="min-h-[44px]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={createProject}
                    disabled={saving}
                    className="min-h-[44px]"
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Project
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel project setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be discarded. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard and exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
