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
  NewProjectWizardData, 
  WIZARD_STEPS,
  ProjectBasics,
  TeamMember,
} from '@/types/projectWizard';
import { OrgType } from '@/types/organization';

// Import step components
import { BasicsStepNew } from '@/components/project-wizard-new/BasicsStep';
import { TeamStep } from '@/components/project-wizard-new/TeamStep';
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
  const { user, userOrgRoles, profile, loading: authLoading } = useAuth();
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

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Basics
        return !!(data.basics.name && data.basics.projectType && data.basics.address && 
                  data.basics.city && data.basics.state && data.basics.zip);
      case 1: // Team - optional
        return true;
      case 2: // Scope - optional
        return true;
      case 3: // Review
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
      
      // Map org type to role label for project_team
      const roleLabel = currentOrg.type === 'GC' ? 'General Contractor' 
        : currentOrg.type === 'TC' ? 'Trade Contractor'
        : currentOrg.type === 'FC' ? 'Field Crew'
        : 'Supplier';
      
      // Add creator to project_team (so they appear on Team page)
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

      setData(prev => ({ ...prev, projectId: project.id }));
      return project.id;
    } catch (error: any) {
      toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const saveTeam = async (projectId: string) => {
    const { data: existingTeam } = await supabase
      .from('project_team')
      .select('invited_email')
      .eq('project_id', projectId);
    
    const existingEmails = new Set((existingTeam || []).map(m => m.invited_email?.toLowerCase()));
    
    for (const member of data.team) {
      if (existingEmails.has(member.contactEmail.toLowerCase())) {
        continue;
      }
      
      try {
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
        total_sqft: data.scope.totalSqft,
        lot_size_acres: data.scope.lotSizeAcres,
        bedrooms: data.scope.bedrooms,
        bathrooms: data.scope.bathrooms,
        garage_type: data.scope.garageType,
        garage_cars: data.scope.garageCars,
        framing_method: data.scope.framingMethod,
      } as any);
    } catch (error: any) {
      console.error('Error saving scope:', error);
    }
  };

  const nextStep = async () => {
    setSaving(true);
    try {
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
        // Fire AI description generation in the background (non-blocking)
        supabase.functions.invoke('generate-scope-description', {
          body: { project_id: data.projectId },
        }).catch(err => console.error('Scope description generation failed:', err));
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
      await supabase
        .from('projects')
        .update({ status: 'setup' })
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
        return (
          <TeamStep 
            team={data.team} 
            onChange={updateTeam} 
            creatorRole={creatorRole}
            projectId={data.projectId}
            creatorOrgType={currentOrg?.type as OrgType | undefined}
          />
        );
      case 2:
        return <ScopeStep projectType={data.basics.projectType} scope={data.scope} onChange={updateScope} />;
      case 3:
        return <ReviewStepNew data={data} creatorRole={creatorRole} />;
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
                  {WIZARD_STEPS.map((step, index) => (
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
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        index < currentStep && "bg-primary text-primary-foreground",
                        index === currentStep && "bg-primary text-primary-foreground",
                        index > currentStep && "bg-muted text-muted-foreground"
                      )}>
                        {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="hidden md:block">
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
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
