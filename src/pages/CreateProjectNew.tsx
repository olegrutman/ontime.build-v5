import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { ProjectBasics, TeamMember } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { useSetupWizardV2 } from '@/hooks/useSetupWizardV2';

import { BasicsStepNew } from '@/components/project-wizard-new/BasicsStep';
import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
import { ContractsStep } from '@/components/project-wizard-new/ContractsStep';
import { UnifiedReviewStep } from '@/components/project-wizard-new/UnifiedReviewStep';

const UNIFIED_STEPS = [
  { id: 'basics', label: 'Project Basics', description: 'Name, location & team' },
  { id: 'contracts', label: 'Contracts', description: 'Contract values' },
  { id: 'building_type', label: 'Building Type', description: 'What are you building?' },
  { id: 'scope', label: 'Scope', description: 'Scope & live SOV' },
  { id: 'review', label: 'Review', description: 'Review and create' },
] as const;

const initialBasics: ProjectBasics = {
  name: '',
  projectType: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

export default function CreateProjectNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, profile, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [basics, setBasics] = useState<ProjectBasics>(initialBasics);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorOrgType = currentOrg?.type as OrgType | undefined;
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' : 
                      currentOrg?.type === 'TC' ? 'Trade Contractor' :
                      currentOrg?.type === 'SUPPLIER' ? 'Supplier' : null;

  const wizard = useSetupWizardV2();

  useEffect(() => {
    if (!authLoading && (!user || !currentOrg)) {
      navigate('/dashboard');
    }
  }, [authLoading, user, currentOrg, navigate]);

  const updateBasics = (updates: Partial<ProjectBasics>) => {
    setBasics(prev => ({ ...prev, ...updates }));
  };

  const isTC = creatorOrgType === 'TC';

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!(basics.name && basics.address && basics.city && basics.state && basics.zip);
      case 1: {
        const hasGcContract = typeof wizard.answers.contract_value === 'number' && wizard.answers.contract_value > 0;
        if (isTC) {
          const hasFcContract = typeof wizard.answers.fc_contract_value === 'number' && wizard.answers.fc_contract_value > 0;
          return hasGcContract && hasFcContract;
        }
        return hasGcContract;
      }
      case 2: return !!wizard.buildingType;
      case 3: return true; // scope questions are optional
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, UNIFIED_STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

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
          project_type: wizard.buildingType || '',
          address: { street: basics.address } as any,
          city: basics.city,
          state: basics.state,
          zip: basics.zip,
          start_date: basics.startDate || null,
          created_by: user.id,
          created_by_org_id: currentOrg.id,
          organization_id: currentOrg.id,
          status: 'setup',
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

      // Save wizard answers + contract(s) + SOV(s)
      await wizard.saveAll(pid, currentOrg.id, currentOrg.type, user.id);

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

      toast({ title: 'Project created!', description: 'Invitations will be sent to team members.' });
      navigate(`/project/${pid}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
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
      case 1:
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
      case 2:
        return (
          <BuildingTypeSelector
            selected={wizard.buildingType}
            onSelect={(bt) => wizard.selectBuildingType(bt)}
          />
        );
      case 3:
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
      case 4:
        return (
          <UnifiedReviewStep
            basics={basics}
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            visibleQuestions={wizard.visibleQuestions}
            sovLines={wizard.sovLines}
            team={team}
            creatorOrgName={currentOrg?.name}
            creatorRole={creatorRole}
            creatorOrgType={creatorOrgType}
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

  return (
    <AppLayout title="Create New Project" fullWidth>
      <div className="mx-auto p-6 w-full">
        <div className="grid grid-cols-12 gap-6">
          {/* Progress sidebar */}
          <div className="col-span-12 md:col-span-2">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {UNIFIED_STEPS.map((step, index) => (
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
                        index < currentStep && "bg-primary text-primary-foreground",
                        index === currentStep && "bg-primary text-primary-foreground",
                        index > currentStep && "bg-muted text-muted-foreground"
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

          {/* Main content */}
          <div className="col-span-12 md:col-span-10">
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

                {currentStep < UNIFIED_STEPS.length - 1 ? (
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
    </AppLayout>
  );
}
