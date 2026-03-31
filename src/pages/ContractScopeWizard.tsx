import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { useToast } from '@/hooks/use-toast';
import { useScopeCategories, useSaveContractScope } from '@/hooks/useContractScope';
import { CategoryStep } from '@/components/contract-scope/CategoryStep';
import { DetailStep } from '@/components/contract-scope/DetailStep';
import { ExclusionStep } from '@/components/contract-scope/ExclusionStep';
import { ScopeSummary } from '@/components/contract-scope/ScopeSummary';
import { COMMON_EXCLUSIONS } from '@/types/contractScope';

const STEPS = [
  { title: 'Categories', description: 'Select scope categories' },
  { title: 'Details', description: 'Configure specifics' },
  { title: 'Exclusions', description: 'What is not included' },
  { title: 'Summary', description: 'Review & save' },
];

export default function ContractScopeWizard() {
  const { id: projectId, contractId } = useParams<{ id: string; contractId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useScopeCategories();
  const saveMutation = useSaveContractScope(projectId!, contractId!);

  const [step, setStep] = useState(0);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, Record<string, string>>>({});
  const [exclusions, setExclusions] = useState<{ label: string; isCustom: boolean }[]>([]);

  const handleToggleCategory = useCallback((slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleDetailChange = useCallback((slug: string, key: string, value: string) => {
    setDetails(prev => ({
      ...prev,
      [slug]: { ...(prev[slug] || {}), [key]: value },
    }));
  }, []);

  const handleToggleExclusion = useCallback((label: string) => {
    setExclusions(prev => {
      const exists = prev.find(e => e.label === label);
      if (exists) return prev.filter(e => e.label !== label);
      return [...prev, { label, isCustom: !COMMON_EXCLUSIONS.includes(label) }];
    });
  }, []);

  const handleAddCustomExclusion = useCallback((label: string) => {
    setExclusions(prev => [...prev, { label, isCustom: true }]);
  }, []);

  const handleRemoveCustomExclusion = useCallback((label: string) => {
    setExclusions(prev => prev.filter(e => e.label !== label));
  }, []);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        selectedSlugs: Array.from(selectedSlugs),
        details,
        exclusions,
      });
      toast({ title: 'Scope saved', description: 'Contract scope has been saved.' });
      navigate(`/project/${projectId}/setup`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSave();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate(`/project/${projectId}/setup`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }

  const slugArray = Array.from(selectedSlugs);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold font-heading">Contract Scope</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <WizardProgress currentStep={step} totalSteps={4} steps={STEPS} />

        {step === 0 && (
          <CategoryStep categories={categories} selected={selectedSlugs} onToggle={handleToggleCategory} />
        )}
        {step === 1 && (
          <DetailStep
            categories={categories}
            selectedSlugs={slugArray}
            details={details}
            onDetailChange={handleDetailChange}
          />
        )}
        {step === 2 && (
          <ExclusionStep
            exclusions={exclusions}
            onToggle={handleToggleExclusion}
            onAddCustom={handleAddCustomExclusion}
            onRemoveCustom={handleRemoveCustomExclusion}
          />
        )}
        {step === 3 && (
          <ScopeSummary
            categories={categories}
            selectedSlugs={slugArray}
            details={details}
            exclusions={exclusions}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-30">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handleBack} className="min-h-[44px]">
            {step === 0 ? 'Back to Contracts' : 'Back'}
          </Button>
          <Button onClick={handleNext} disabled={saveMutation.isPending} className="min-h-[44px]">
            {step === 3 ? (saveMutation.isPending ? 'Saving...' : 'Save Scope') : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
