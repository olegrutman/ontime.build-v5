import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { WizardProgress } from '@/components/work-order-wizard/WizardProgress';
import { useProjectScope } from '@/hooks/useProjectScope';
import { useToast } from '@/hooks/use-toast';
import {
  INITIAL_RFI_WIZARD_DATA,
  RFI_QUESTION_TEMPLATES,
  type RFIWizardData,
  type CreateRFIPayload,
} from '@/types/rfi';
import { RFILocationStep } from './wizard/RFILocationStep';
import { RFICategoryStep } from './wizard/RFICategoryStep';
import { RFIQuestionStep } from './wizard/RFIQuestionStep';
import { RFIRoutingStep } from './wizard/RFIRoutingStep';
import { RFIReviewStep } from './wizard/RFIReviewStep';

interface TeamOrg {
  org_id: string;
  org_name: string;
}

interface CreateRFIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentOrgId: string;
  currentUserId: string;
  teamOrgs: TeamOrg[];
  onSubmit: (payload: CreateRFIPayload) => Promise<void>;
}

const STEPS = [
  { title: 'Location' },
  { title: 'Category' },
  { title: 'Details' },
  { title: 'Routing' },
  { title: 'Review' },
];

export function CreateRFIDialog({
  open, onOpenChange, projectId, currentOrgId, currentUserId, teamOrgs, onSubmit,
}: CreateRFIDialogProps) {
  const { toast } = useToast();
  const { data: projectScope } = useProjectScope(projectId);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RFIWizardData>(INITIAL_RFI_WIZARD_DATA);
  const [submitting, setSubmitting] = useState(false);

  const assignableOrgs = useMemo(() => teamOrgs.filter((o) => o.org_id !== currentOrgId), [teamOrgs, currentOrgId]);

  const update = useCallback((updates: Partial<RFIWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Build auto subject + question when entering review step
  const generateSubjectAndQuestion = useCallback(() => {
    const loc = data.location_data;
    const template = RFI_QUESTION_TEMPLATES.find((t) => t.id === data.templateId);

    // Location prefix
    let locParts: string[] = [];
    if (loc.inside_outside === 'inside') {
      if (loc.level) locParts.push(loc.level);
      const room = loc.room_area === 'Other' ? loc.custom_room_area : loc.room_area;
      if (room) locParts.push(room);
    } else if (loc.inside_outside === 'outside') {
      if (loc.exterior_feature === 'other' && loc.custom_exterior) {
        locParts.push(loc.custom_exterior);
      } else if (loc.exterior_feature) {
        locParts.push(loc.exterior_feature.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }
    const locStr = locParts.join(' ');

    if (!template) return { subject: '', question: '' };

    // General free-form
    if (template.id === 'general_freeform') {
      return {
        subject: data.answers.subject_custom || `${locStr} - General Question`,
        question: data.answers.question_custom || '',
      };
    }

    const suffix = template.subjectSuffix;
    const subject = locStr ? `${locStr} - ${suffix}` : suffix;

    // Build question body from answers
    const answerParts = template.prompts.map((p) => {
      const val = data.answers[p.key];
      if (!val) return null;
      const unit = data.answerUnits[p.key];
      return `${p.label}: ${val}${unit ? ` ${unit}` : ''}`;
    }).filter(Boolean);

    const locContext = locStr
      ? `At ${locStr} (${loc.inside_outside === 'inside' ? 'Inside' : 'Outside'}): `
      : '';

    const question = `${locContext}${template.label}${answerParts.length ? '\n' + answerParts.join('\n') : ''}`;

    return { subject, question };
  }, [data]);

  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return !!(data.location_data.level || data.location_data.exterior_feature);
      case 2: return !!data.templateId;
      case 3: {
        const template = RFI_QUESTION_TEMPLATES.find((t) => t.id === data.templateId);
        if (!template) return false;
        // At least one prompt filled
        return template.prompts.some((p) => !!data.answers[p.key]?.trim());
      }
      case 4: return !!data.assignedToOrgId;
      case 5: return !!data.subject.trim() && !!data.question.trim();
      default: return true;
    }
  };

  const goNext = () => {
    if (step < STEPS.length && canGoNext()) {
      // When moving to review, auto-generate
      if (step === 4) {
        const { subject, question } = generateSubjectAndQuestion();
        setData((prev) => ({
          ...prev,
          subject: prev.subject || subject,
          question: prev.question || question,
        }));
      }
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      // Clear auto-generated text when going back from review
      if (step === 5) {
        setData((prev) => ({ ...prev, subject: '', question: '' }));
      }
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!data.subject.trim() || !data.question.trim() || !data.assignedToOrgId) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Build reference area from location
      const loc = data.location_data;
      let refArea = '';
      if (loc.inside_outside === 'inside') {
        refArea = [loc.level, loc.room_area === 'Other' ? loc.custom_room_area : loc.room_area].filter(Boolean).join(', ');
      } else {
        refArea = loc.exterior_feature === 'other' ? (loc.custom_exterior || '') : (loc.exterior_feature || '');
      }

      await onSubmit({
        project_id: projectId,
        subject: data.subject.trim(),
        question: data.question.trim(),
        priority: data.priority,
        submitted_by_org_id: currentOrgId,
        submitted_by_user_id: currentUserId,
        assigned_to_org_id: data.assignedToOrgId,
        due_date: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : null,
        reference_area: refArea || null,
        location_data: data.location_data as Record<string, string>,
      });
      toast({ title: 'RFI submitted' });
      resetWizard();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setData(INITIAL_RFI_WIZARD_DATA);
    setStep(1);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <WizardProgress currentStep={step} totalSteps={STEPS.length} steps={STEPS} />

        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {step === 1 && <RFILocationStep data={data} onChange={update} projectScope={projectScope || null} />}
          {step === 2 && <RFICategoryStep data={data} onChange={update} />}
          {step === 3 && <RFIQuestionStep data={data} onChange={update} />}
          {step === 4 && <RFIRoutingStep data={data} onChange={update} assignableOrgs={assignableOrgs} />}
          {step === 5 && <RFIReviewStep data={data} onChange={update} />}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canGoNext()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit RFI
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
