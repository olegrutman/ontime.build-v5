import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  NewProjectWizardData, 
  WIZARD_STEPS,
  ProjectBasics,
  TeamMember,
  ScopeDetails,
  ProjectContract
} from '@/types/projectWizard';

// Import step components
import { BasicsStepNew } from '@/components/project-wizard-new/BasicsStep';
import { TeamStep } from '@/components/project-wizard-new/TeamStep';
import { ScopeStep } from '@/components/project-wizard-new/ScopeStep';
import { ContractsStep } from '@/components/project-wizard-new/ContractsStep';
import { ReviewStepNew } from '@/components/project-wizard-new/ReviewStep';

const initialBasics: ProjectBasics = {
  name: '',
  projectType: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

const initialData: NewProjectWizardData = {
  basics: initialBasics,
  team: [],
  scope: {},
  contracts: [],
};

export default function CreateProjectNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<NewProjectWizardData>(initialData);
  const [saving, setSaving] = useState(false);

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' : 
                      currentOrg?.type === 'TC' ? 'Trade Contractor' : null;

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && (!user || !currentOrg)) {
      navigate('/dashboard');
    }
  }, [authLoading, user, currentOrg, navigate]);

  const updateBasics = (updates: Partial<ProjectBasics>) => {
    setData(prev => ({ ...prev, basics: { ...prev.basics, ...updates } }));
  };

  const updateTeam = (team: TeamMember[]) => {
    setData(prev => ({ ...prev, team }));
  };

  const updateScope = (scope: ScopeDetails) => {
    setData(prev => ({ ...prev, scope }));
  };

  const updateContracts = (contracts: ProjectContract[]) => {
    setData(prev => ({ ...prev, contracts }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Basics
        return !!(data.basics.name && data.basics.projectType && data.basics.address && 
                  data.basics.city && data.basics.state && data.basics.zip);
      case 1: // Team - optional
        return true;
      case 2: // Scope - optional but should have some data
        return true;
      case 3: // Contracts
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const saveBasics = async (): Promise<string | null> => {
    if (data.projectId) return data.projectId;
    
    if (!currentOrg?.id || !user?.id) {
      toast({ title: 'Error', description: 'Organization not found', variant: 'destructive' });
      return null;
    }
    
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: data.basics.name,
          project_type: data.basics.projectType,
          address: { street: data.basics.address } as any,
          city: data.basics.city,
          state: data.basics.state,
          zip: data.basics.zip,
          start_date: data.basics.startDate || null,
          created_by: user.id,
          created_by_org_id: currentOrg.id,
          organization_id: currentOrg.id,
          status: 'draft',
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

      setData(prev => ({ ...prev, projectId: project.id }));
      return project.id;
    } catch (error: any) {
      toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const saveTeam = async (projectId: string) => {
    for (const member of data.team) {
      try {
        // Insert into project_team
        const { data: teamMember, error: teamError } = await supabase
          .from('project_team')
          .insert({
            project_id: projectId,
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

        // Create invite token
        await supabase.from('project_invites').insert({
          project_id: projectId,
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

  const saveScope = async (projectId: string) => {
    try {
      await supabase.from('project_scope_details').upsert({
        project_id: projectId,
        home_type: data.scope.homeType,
        floors: data.scope.floors,
        foundation_type: data.scope.foundationType,
        basement_type: data.scope.basementType,
        basement_finish: data.scope.basementFinish,
        stairs_type: data.scope.stairsType,
        has_elevator: data.scope.hasElevator,
        shaft_type: data.scope.shaftType,
        shaft_type_notes: data.scope.shaftTypeNotes,
        roof_type: data.scope.roofType,
        has_roof_deck: data.scope.hasRoofDeck,
        roof_deck_type: data.scope.roofDeckType,
        has_covered_porches: data.scope.hasCoveredPorches,
        has_balconies: data.scope.hasBalconies,
        balcony_type: data.scope.balconyType,
        decking_included: data.scope.deckingIncluded,
        decking_type: data.scope.deckingType,
        decking_type_other: data.scope.deckingTypeOther,
        siding_included: data.scope.sidingIncluded,
        siding_materials: data.scope.sidingMaterials || [],
        siding_material_other: data.scope.sidingMaterialOther,
        decorative_included: data.scope.decorativeIncluded,
        decorative_items: data.scope.decorativeItems || [],
        decorative_item_other: data.scope.decorativeItemOther,
        fascia_included: data.scope.fasciaIncluded,
        soffit_included: data.scope.soffitIncluded,
        fascia_soffit_material: data.scope.fasciaSoffitMaterial,
        fascia_soffit_material_other: data.scope.fasciaSoffitMaterialOther,
        windows_included: data.scope.windowsIncluded,
        wrb_included: data.scope.wrbIncluded,
        ext_doors_included: data.scope.extDoorsIncluded,
        num_buildings: data.scope.numBuildings,
        stories: data.scope.stories,
        construction_type: data.scope.constructionType,
        construction_type_other: data.scope.constructionTypeOther,
        num_units: data.scope.numUnits,
        stories_per_unit: data.scope.storiesPerUnit,
        has_shared_walls: data.scope.hasSharedWalls,
      });
    } catch (error: any) {
      console.error('Error saving scope:', error);
    }
  };

  const saveContracts = async (projectId: string) => {
    for (const contract of data.contracts) {
      try {
        const teamMember = data.team.find(t => t.id === contract.toTeamMemberId);
        if (!teamMember) continue;

        await supabase.from('project_contracts').insert({
          project_id: projectId,
          from_org_id: currentOrg?.id,
          from_role: creatorRole,
          to_role: teamMember.role,
          trade: teamMember.trade,
          contract_sum: contract.contractSum,
          retainage_percent: contract.retainagePercent,
          allow_mobilization_line_item: contract.allowMobilization,
          notes: contract.notes,
          created_by_user_id: user?.id,
        });
      } catch (error: any) {
        console.error('Error saving contract:', error);
      }
    }
  };

  const nextStep = async () => {
    setSaving(true);
    try {
      // Save data on each step
      if (currentStep === 0) {
        const projectId = await saveBasics();
        if (!projectId) {
          setSaving(false);
          return;
        }
      } else if (currentStep === 1 && data.projectId) {
        await saveTeam(data.projectId);
      } else if (currentStep === 2 && data.projectId) {
        await saveScope(data.projectId);
      } else if (currentStep === 3 && data.projectId) {
        await saveContracts(data.projectId);
      }
      
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    } finally {
      setSaving(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const createProject = async () => {
    if (!data.projectId) return;
    
    setSaving(true);
    try {
      // Activate the project
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', data.projectId);

      toast({ title: 'Project created!', description: 'Invitations will be sent to team members.' });
      navigate(`/project/${data.projectId}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicsStepNew data={data.basics} onChange={updateBasics} />;
      case 1:
        return <TeamStep team={data.team} onChange={updateTeam} creatorRole={creatorRole} />;
      case 2:
        return <ScopeStep projectType={data.basics.projectType} scope={data.scope} onChange={updateScope} />;
      case 3:
        return <ContractsStep team={data.team} contracts={data.contracts} onChange={updateContracts} creatorRole={creatorRole} />;
      case 4:
        return <ReviewStepNew data={data} />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
        
        <div className="grid grid-cols-12 gap-6">
          {/* Progress sidebar */}
          <div className="col-span-3">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {WIZARD_STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        index === currentStep && "bg-primary/10",
                        index < currentStep && "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        index < currentStep && "bg-primary text-primary-foreground",
                        index === currentStep && "bg-primary text-primary-foreground",
                        index > currentStep && "bg-muted text-muted-foreground"
                      )}>
                        {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="col-span-9">
            <Card>
              <CardContent className="p-6">
                {renderStep()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0 || saving}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed() || saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={createProject}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Project
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
