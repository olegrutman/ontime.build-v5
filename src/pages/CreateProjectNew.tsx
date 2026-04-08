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
import { 
  ProjectBasics,
  TeamMember,
} from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { useSetupWizardV2 } from '@/hooks/useSetupWizardV2';

// Import step components
import { BasicsStepNew } from '@/components/project-wizard-new/BasicsStep';
import { BuildingTypeSelector } from '@/components/setup-wizard-v2/BuildingTypeSelector';
import { ScopeQuestionsPanel } from '@/components/setup-wizard-v2/ScopeQuestionsPanel';
import { TeamStep } from '@/components/project-wizard-new/TeamStep';
import { UnifiedReviewStep } from '@/components/project-wizard-new/UnifiedReviewStep';

const UNIFIED_STEPS = [
  { id: 'basics', label: 'Project Basics', description: 'Name and location' },
  { id: 'building_type', label: 'Building Type', description: 'What are you building?' },
  { id: 'scope', label: 'Scope & Contract', description: 'Questions and SOV' },
  { id: 'team', label: 'Project Team', description: 'Invite contractors' },
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
  const [projectId, setProjectId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' : 
                      currentOrg?.type === 'TC' ? 'Trade Contractor' :
                      currentOrg?.type === 'SUPPLIER' ? 'Supplier' : null;

  // Setup wizard hook (no projectId initially — answers stored in memory)
  const wizard = useSetupWizardV2();

  useEffect(() => {
    if (!authLoading && (!user || !currentOrg)) {
      navigate('/dashboard');
    }
  }, [authLoading, user, currentOrg, navigate]);

  const updateBasics = (updates: Partial<ProjectBasics>) => {
    setBasics(prev => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Basics
        return !!(basics.name && basics.address && basics.city && basics.state && basics.zip);
      case 1: // Building type
        return !!wizard.buildingType;
      case 2: // Scope — at least contract value should be set
        return typeof wizard.answers.contract_value === 'number' && wizard.answers.contract_value > 0;
      case 3: // Team — optional
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const saveBasics = async (): Promise<string | null> => {
    if (projectId) return projectId;
    
    if (!currentOrg?.id || !user?.id) {
      toast({ title: 'Error', description: 'Organization not found', variant: 'destructive' });
      return null;
    }
    
    try {
      const { data: project, error } = await supabase
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

      if (error) throw error;
      
      // Add creator to project_participants
      await supabase.from('project_participants').insert({
        project_id: project.id,
        organization_id: currentOrg.id,
        role: currentOrg.type as any,
        invite_status: 'ACCEPTED',
        invited_by: user.id,
      });
      
      const roleLabel = currentOrg.type === 'GC' ? 'General Contractor' 
        : currentOrg.type === 'TC' ? 'Trade Contractor'
        : currentOrg.type === 'FC' ? 'Field Crew'
        : 'Supplier';
      
      await supabase.from('project_team').insert({
        project_id: project.id,
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
      });

      setProjectId(project.id);
      return project.id;
    } catch (error: any) {
      toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const saveTeam = async (pid: string) => {
    const { data: existingTeam } = await supabase
      .from('project_team')
      .select('invited_email')
      .eq('project_id', pid);
    
    const existingEmails = new Set((existingTeam || []).map(m => m.invited_email?.toLowerCase()));
    
    for (const member of team) {
      if (existingEmails.has(member.contactEmail.toLowerCase())) continue;
      
      try {
        const { data: teamMember, error: teamError } = await supabase
          .from('project_team')
          .insert({
            project_id: pid,
            role: member.role,
            trade: member.trade,
            trade_custom: member.tradeCustom,
            invited_email: member.contactEmail,
            invited_name: member.contactName,
            invited_org_name: member.companyName,
            invited_by_user_id: user?.id,
            status: 'Invited',
          })
          .select('id')
          .single();

        if (teamError) throw teamError;

        await supabase.from('project_invites').insert({
          project_id: pid,
          project_team_id: teamMember.id,
          role: member.role,
          trade: member.trade,
          trade_custom: member.tradeCustom,
          invited_email: member.contactEmail,
          invited_name: member.contactName,
          invited_org_name: member.companyName,
          invited_by_user_id: user?.id,
        });
      } catch (error: any) {
        console.error('Error saving team member:', error);
      }
    }
  };

  const nextStep = async () => {
    setSaving(true);
    try {
      // When leaving scope step (step 2), create the project if not yet created
      if (currentStep === 2 && !projectId) {
        const pid = await saveBasics();
        if (!pid) { setSaving(false); return; }
      }
      // When leaving team step (step 3), save team members
      if (currentStep === 3 && projectId) {
        await saveTeam(projectId);
      }
      setCurrentStep(prev => Math.min(prev + 1, UNIFIED_STEPS.length - 1));
    } finally {
      setSaving(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const createProject = async () => {
    setSaving(true);
    try {
      let pid = projectId;
      // Ensure project exists
      if (!pid) {
        pid = await saveBasics();
        if (!pid) { setSaving(false); return; }
      }

      // Save wizard answers + contract + SOV
      await wizard.saveAll(pid);

      // Save any remaining team members
      await saveTeam(pid);

      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'setup', project_type: wizard.buildingType || '' })
        .eq('id', pid);

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
        return <BasicsStepNew data={basics} onChange={updateBasics} />;
      case 1:
        return (
          <BuildingTypeSelector
            selected={wizard.buildingType}
            onSelect={(bt) => {
              wizard.selectBuildingType(bt);
            }}
          />
        );
      case 2:
        return wizard.buildingType ? (
          <ScopeQuestionsPanel
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            setAnswer={wizard.setAnswer}
            visibleQuestions={wizard.visibleQuestions}
            sovLines={wizard.sovLines}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Please go back and select a building type first.
          </p>
        );
      case 3:
        return (
          <TeamStep 
            team={team} 
            onChange={setTeam} 
            creatorRole={creatorRole}
            projectId={projectId}
            creatorOrgType={currentOrg?.type as OrgType | undefined}
          />
        );
      case 4:
        return (
          <UnifiedReviewStep
            basics={basics}
            buildingType={wizard.buildingType}
            answers={wizard.answers}
            visibleQuestions={wizard.visibleQuestions}
            sovLines={wizard.sovLines}
            projectId={projectId}
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
    <AppLayout title="Create New Project">
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Progress sidebar */}
          <div className="col-span-12 md:col-span-3">
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
          <div className="col-span-12 md:col-span-9">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                {renderStep()}
              </CardContent>

              {/* Navigation Footer */}
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
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
