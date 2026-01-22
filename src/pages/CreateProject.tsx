import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ProjectWizardData, SOVLineItem } from '@/types/project';
import {
  WizardProgress,
  BasicsStep,
  StructuresStep,
  PartiesStep,
  ScopeStep,
  SOVBuilderStep,
  ReviewStep,
} from '@/components/project-wizard';

const STEPS = [
  { label: 'Basics', description: 'Project identity & address' },
  { label: 'Structures', description: 'Buildings & structures' },
  { label: 'Parties', description: 'Invite TCs & suppliers' },
  { label: 'Scope', description: 'Framing & area details' },
  { label: 'SOV Builder', description: 'Generate line items' },
  { label: 'Review', description: 'Confirm & create' },
];

const initialData: ProjectWizardData = {
  name: '',
  project_type: 'residential',
  build_type: 'new_construction',
  address: { street: '', city: '', state: '', zip: '' },
  structures: [],
  parties: [],
  scope: {
    floors: 1,
    foundation: 'slab',
    framing_method: 'stick',
    has_stairs: false,
    has_elevator: false,
    areas: [],
    custom_areas: [],
  },
  mobilization_enabled: false,
  retainage_percent: 0,
  sov_items: [],
};

export default function CreateProject() {
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<ProjectWizardData>(initialData);
  const [creating, setCreating] = useState(false);

  // Get user's GC organization (only GC can create projects)
  const gcOrg = userOrgRoles.find((r) => r.organization?.type === 'GC');

  const updateData = (updates: Partial<ProjectWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basics
        return data.name && data.address?.street && data.address?.city;
      case 1: // Structures
        return data.structures.length > 0;
      case 2: // Parties (optional)
        return true;
      case 3: // Scope
        return data.scope.floors > 0;
      case 4: // SOV Builder
        return data.sov_items.length > 0 && data.sov_items.every((i) => i.title);
      case 5: // Review
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createProject = async () => {
    if (!user || !gcOrg?.organization_id) {
      toast.error('You must be logged in with a GC organization to create projects');
      return;
    }

    setCreating(true);

    try {
      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          organization_id: gcOrg.organization_id,
          name: data.name,
          description: `${data.project_type} - ${data.build_type}`,
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Create PROJECT work item
      const { data: projectWorkItem, error: wiError } = await supabase
        .from('work_items')
        .insert({
          organization_id: gcOrg.organization_id,
          project_id: project.id,
          item_type: 'PROJECT',
          title: data.name,
          description: `${data.project_type} - ${data.build_type}`,
          state: 'OPEN',
          created_by: user.id,
        })
        .select()
        .single();

      if (wiError) throw wiError;

      // 3. Create SOV_ITEM work items for each SOV line
      const sovItems = data.sov_items.map((item: SOVLineItem, index: number) => ({
        organization_id: gcOrg.organization_id,
        project_id: project.id,
        parent_work_item_id: projectWorkItem.id,
        item_type: 'SOV_ITEM',
        title: item.title,
        description: item.description || null,
        code: item.code,
        state: 'OPEN',
        amount: item.amount || null,
        location_ref: item.structure_id ? `${item.structure_id}/${item.floor || ''}/${item.area || ''}` : null,
        created_by: user.id,
      }));

      if (sovItems.length > 0) {
        const { error: sovError } = await supabase.from('work_items').insert(sovItems);
        if (sovError) throw sovError;
      }

      // 4. Create work_item_participants for invited parties
      if (data.parties.length > 0) {
        const participants = data.parties.map((party) => ({
          work_item_id: projectWorkItem.id,
          organization_id: party.org_id!,
          invited_by: user.id,
        }));

        const { error: partError } = await supabase
          .from('work_item_participants')
          .insert(participants);
        
        if (partError) throw partError;
      }

      toast.success('Project created successfully!');
      navigate(`/project/${project.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicsStep data={data} onChange={updateData} />;
      case 1:
        return <StructuresStep data={data} onChange={updateData} />;
      case 2:
        return <PartiesStep data={data} onChange={updateData} />;
      case 3:
        return <ScopeStep data={data} onChange={updateData} />;
      case 4:
        return <SOVBuilderStep data={data} onChange={updateData} />;
      case 5:
        return <ReviewStep data={data} />;
      default:
        return null;
    }
  };

  if (!gcOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              Only General Contractor organizations can create projects.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <h1 className="font-semibold">Create Project</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-4">
                <WizardProgress currentStep={currentStep} steps={STEPS} />
              </CardContent>
            </Card>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                {renderStep()}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button onClick={nextStep} disabled={!canProceed()}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={createProject} disabled={creating || !canProceed()}>
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Project'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
