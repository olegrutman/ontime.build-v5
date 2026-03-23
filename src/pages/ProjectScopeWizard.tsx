import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { useToast } from '@/hooks/use-toast';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import {
  useScopeSections, useScopeItems, useScopeSelections,
  filterSections, filterItems, useSaveScopeSelections,
} from '@/hooks/useScopeWizard';
import type { ProfileDraft, ScopeItem } from '@/types/projectProfile';

export default function ProjectScopeWizard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useProjectProfile(projectId);
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: allSections = [] } = useScopeSections();
  const { data: allItems = [] } = useScopeItems();
  const { data: existingSelections = [] } = useScopeSelections(projectId);
  const saveMutation = useSaveScopeSelections(projectId!);

  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const projectType = useMemo(
    () => projectTypes.find(t => t.id === profile?.project_type_id),
    [projectTypes, profile],
  );

  const profileDraft: ProfileDraft | null = profile as ProfileDraft | null;

  const visibleSections = useMemo(
    () => profileDraft ? filterSections(allSections, profileDraft) : [],
    [allSections, profileDraft],
  );

  const sectionItems = useMemo(() => {
    if (!profileDraft || !projectType) return {};
    const map: Record<string, ScopeItem[]> = {};
    for (const s of visibleSections) {
      map[s.id] = filterItems(allItems, s.id, profileDraft, projectType.slug);
    }
    return map;
  }, [visibleSections, allItems, profileDraft, projectType]);

  // Initialize toggles from existing selections or defaults
  useEffect(() => {
    if (initialized || !profileDraft || !projectType || allItems.length === 0) return;

    const existing = new Map(existingSelections.map(s => [s.scope_item_id, s.is_on]));
    const init: Record<string, boolean> = {};

    for (const items of Object.values(sectionItems)) {
      for (const item of items) {
        init[item.id] = existing.has(item.id) ? existing.get(item.id)! : item.default_on;
      }
    }

    setToggles(init);
    setInitialized(true);
  }, [profileDraft, projectType, allItems, existingSelections, sectionItems, initialized]);

  // Redirect if no profile
  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate(`/project/${projectId}/details-wizard`, { replace: true });
    }
  }, [profileLoading, profile, projectId, navigate]);

  const conflicts = existingSelections.filter(s => s.is_conflict);

  const handleSave = async () => {
    if (!profile) return;
    try {
      const items = Object.entries(toggles).map(([scope_item_id, is_on]) => ({ scope_item_id, is_on }));
      await saveMutation.mutateAsync({ profileId: profile.id, items });
      toast({ title: 'Scope saved', description: 'Opening Contracts...' });
      navigate(`/project/${projectId}/contracts`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (profileLoading || !profileDraft) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }

  // Filter out sections with no items
  const nonEmptySections = visibleSections.filter(s => (sectionItems[s.id] || []).length > 0);
  const totalSteps = nonEmptySections.length;
  const safeStep = Math.min(currentStep, totalSteps - 1);
  const currentSection = nonEmptySections[safeStep];
  const currentItems = currentSection ? (sectionItems[currentSection.id] || []) : [];

  const totalOn = Object.values(toggles).filter(Boolean).length;
  const totalItems = Object.values(toggles).length;

  const handleNext = () => {
    if (safeStep < totalSteps - 1) {
      setCurrentStep(safeStep + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (safeStep > 0) {
      setCurrentStep(safeStep - 1);
    } else {
      navigate(`/project/${projectId}/details-wizard`);
    }
  };

  const isLastStep = safeStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Profile banner */}
      <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-primary/15 text-primary border-0">{projectType?.name}</Badge>
            <span className="text-muted-foreground">{profileDraft.stories} stories</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{totalOn}/{totalItems} items on</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to={`/project/${projectId}/details-wizard`}>
              <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile</Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${projectId}/scope`)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Step indicator */}
        {totalSteps > 0 && (
          <WizardProgress
            currentStep={safeStep}
            totalSteps={totalSteps}
            steps={nonEmptySections.map(s => ({ title: s.label, description: s.description || undefined }))}
          />
        )}

        {conflicts.length > 0 && safeStep === 0 && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{conflicts.length} items in your scope no longer match your project profile. Review before continuing.</span>
          </div>
        )}

        {/* Current section */}
        {currentSection && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold font-heading">{currentSection.label}</h2>
              {currentSection.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentSection.description}</p>
              )}
            </div>

            <div className="rounded-lg border bg-card divide-y">
              {currentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Switch
                    checked={toggles[item.id] ?? item.default_on}
                    onCheckedChange={v => setToggles(p => ({ ...p, [item.id]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-30">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handleBack} className="min-h-[44px]">
            {safeStep === 0 ? 'Back to Profile' : 'Back'}
          </Button>
          <Button onClick={handleNext} disabled={saveMutation.isPending} className="min-h-[44px]">
            {isLastStep
              ? (saveMutation.isPending ? 'Saving...' : 'Save Scope & Continue')
              : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
