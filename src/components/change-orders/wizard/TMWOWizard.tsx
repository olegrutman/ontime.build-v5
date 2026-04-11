import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { VisualLocationPicker } from '../VisualLocationPicker';
import type { COCreatedByRole } from '@/types/changeOrder';

// ── Work Type definitions ─────────────────────────────
type WorkTypeKey = 'demolition' | 'framing' | 'reframing' | 'sheathing' | 'blocking' | 'backout' | 'exterior' | 'stairs' | 'other';

interface WorkTypeDef {
  key: WorkTypeKey;
  label: string;
  icon: string;
  subtypes: string[];
}

const WORK_TYPES: WorkTypeDef[] = [
  { key: 'demolition', label: 'Demolition', icon: '🔨', subtypes: ['Selective demo', 'Full gut', 'Wall removal', 'Ceiling demo', 'Floor demo', 'Cabinet removal', 'Fixture removal'] },
  { key: 'framing', label: 'Framing', icon: '🏗️', subtypes: ['New wall', 'Partition wall', 'Header install', 'Soffit framing', 'Bulkhead', 'Closet build-out', 'Niche framing'] },
  { key: 'reframing', label: 'Reframing', icon: '🔄', subtypes: ['Wall modification', 'Opening added', 'Header replacement', 'Structural repair', 'Load-bearing change', 'Window rough-in change', 'Door rough-in change'] },
  { key: 'sheathing', label: 'Sheathing', icon: '📋', subtypes: ['Wall sheathing', 'Roof sheathing', 'Subfloor', 'Backer board', 'Shear panel'] },
  { key: 'blocking', label: 'Blocking', icon: '🧱', subtypes: ['TV mount blocking', 'Grab bar blocking', 'Cabinet blocking', 'Handrail blocking', 'Shelf blocking', 'General blocking'] },
  { key: 'backout', label: 'Backout', icon: '🔙', subtypes: ['MEP backout', 'Inspection fix', 'Code correction', 'Punch list', 'Warranty callback'] },
  { key: 'exterior', label: 'Exterior Scope', icon: '🏠', subtypes: ['Deck framing', 'Pergola', 'Fence framing', 'Siding prep', 'Fascia/soffit', 'Exterior trim'] },
  { key: 'stairs', label: 'Stairs', icon: '🪜', subtypes: ['New staircase', 'Stair modification', 'Landing framing', 'Handrail framing', 'Stringer replacement'] },
  { key: 'other', label: 'Other', icon: '📝', subtypes: [] },
];

// ── Wizard data ───────────────────────────────────────
interface TMWOData {
  workType: WorkTypeKey | null;
  subtypes: string[];
  customSubtype: string;
  quantity: string;
  scopeNotes: string;
  locationTag: string;
  materialsNeeded: boolean;
  materialsResponsible: 'GC' | 'TC' | null;
  materialNotes: string;
  equipmentNeeded: boolean;
  equipmentResponsible: 'GC' | 'TC' | null;
  urgency: 'Standard' | 'Urgent' | 'Emergency';
  aiDescription: string;
  estimatedCost: string;
  shareDraftNow: boolean;
  fcInputNeeded: boolean;
  fcOrgId: string;
}

const INITIAL_DATA: TMWOData = {
  workType: null,
  subtypes: [],
  customSubtype: '',
  quantity: '',
  scopeNotes: '',
  locationTag: '',
  materialsNeeded: false,
  materialsResponsible: null,
  materialNotes: '',
  equipmentNeeded: false,
  equipmentResponsible: null,
  urgency: 'Standard',
  aiDescription: '',
  estimatedCost: '',
  shareDraftNow: false,
  fcInputNeeded: false,
  fcOrgId: '',
};

const STEPS = [
  { key: 'work_type', label: 'Work Type', description: 'What kind of work is this?' },
  { key: 'scope', label: 'Scope Details', description: 'Describe the scope of work' },
  { key: 'location', label: 'Location', description: 'Where will this work happen?' },
  { key: 'resources', label: 'Resources', description: 'Materials, equipment & urgency' },
  { key: 'review', label: 'Review', description: 'Review and submit' },
] as const;

interface TMWOWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function TMWOWizard({ open, onOpenChange, projectId }: TMWOWizardProps) {
  const { currentRole, user, userOrgRoles } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<TMWOData>({ ...INITIAL_DATA });
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const { shareCO } = useChangeOrders(projectId);

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const role: COCreatedByRole =
    currentRole === 'GC_PM' ? 'GC' : currentRole === 'TC_PM' ? 'TC' : 'FC';
  const orgName = (userOrgRoles?.[0] as any)?.organization?.name ?? role;

  // Project name for AI prompt
  const { data: project } = useQuery({
    queryKey: ['project-name', projectId],
    queryFn: async () => {
      const { data: p } = await supabase.from('projects').select('name').eq('id', projectId).single();
      return p;
    },
  });

  function update(patch: Partial<TMWOData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  const savedLocation = (() => {
    try { return localStorage.getItem(`${user?.id}_${projectId}_last_location`); }
    catch { return null; }
  })();

  const selectedWorkType = WORK_TYPES.find(w => w.key === data.workType);

  function canAdvance(): boolean {
    const s = STEPS[step];
    if (s.key === 'work_type') return !!data.workType;
    if (s.key === 'scope') return data.subtypes.length > 0 || !!data.customSubtype;
    if (s.key === 'location') return !!data.locationTag;
    if (s.key === 'resources') return true;
    if (s.key === 'review') return !!data.aiDescription.trim();
    return true;
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      // Auto-generate AI description when entering review step
      if (STEPS[nextStep].key === 'review' && !data.aiDescription) {
        generateAIDescription();
      }
    }
  }
  function handleBack() { if (step > 0) setStep(s => s - 1); }

  async function generateAIDescription() {
    setGeneratingAI(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('generate-work-order-description', {
        body: {
          work_type: data.workType,
          location: { inside_outside: 'inside' },
          project_name: project?.name ?? 'Project',
          requires_materials: data.materialsNeeded,
          requires_equipment: data.equipmentNeeded,
          material_responsibility: data.materialsResponsible,
          equipment_responsibility: data.equipmentResponsible,
          structural_element: data.subtypes.join(', '),
          scope_size: data.quantity || undefined,
          urgency: data.urgency,
          existing_conditions: data.scopeNotes || undefined,
        },
      });
      if (error) throw error;
      if (resp?.description) {
        update({ aiDescription: resp.description });
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      // Build a fallback description
      const parts = [
        selectedWorkType?.label ?? data.workType,
        data.subtypes.length > 0 ? `— ${data.subtypes.join(', ')}` : '',
        data.quantity ? `(${data.quantity})` : '',
        data.locationTag ? `at ${data.locationTag}` : '',
        data.scopeNotes ? `\n\n${data.scopeNotes}` : '',
      ].filter(Boolean);
      update({ aiDescription: parts.join(' ') });
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSubmit() {
    if (!orgId || !user) { toast.error('Not authenticated'); return; }
    setSubmitting(true);
    try {
      const { count } = await supabase
        .from('change_orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      const seq = (count ?? 0) + 1;
      const woNumber = `WO-${String(seq).padStart(3, '0')}`;
      const title = `${woNumber} · ${selectedWorkType?.label ?? 'Work Order'} · ${format(new Date(), 'MMM d')}`;
      const preGeneratedId = crypto.randomUUID();

      let resolvedAssignedToOrgId: string | null = null;
      if (role === 'TC' || role === 'FC') {
        const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
        resolvedAssignedToOrgId = proj?.organization_id ?? null;
      }

      const { error: insertError } = await supabase
        .from('change_orders')
        .insert({
          id: preGeneratedId,
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: role,
          title,
          co_number: woNumber,
          status: 'draft',
          pricing_type: 'tm',
          reason: data.workType as string,
          reason_note: data.aiDescription,
          location_tag: data.locationTag || null,
          assigned_to_org_id: resolvedAssignedToOrgId,
          fc_input_needed: data.fcInputNeeded,
          materials_needed: data.materialsNeeded,
          materials_responsible: data.materialsResponsible,
          equipment_needed: data.equipmentNeeded,
          equipment_responsible: data.equipmentResponsible,
          draft_shared_with_next: data.shareDraftNow,
          gc_budget: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        });
      if (insertError) throw insertError;

      // Insert a line item for the work type
      const lineItemName = [
        selectedWorkType?.label,
        data.subtypes.length > 0 ? `— ${data.subtypes.join(', ')}` : '',
      ].filter(Boolean).join(' ');

      await supabase.from('co_line_items').insert({
        co_id: preGeneratedId,
        org_id: orgId,
        created_by_role: role,
        item_name: lineItemName,
        unit: data.quantity ? 'ea' : 'LS',
        qty: data.quantity ? parseFloat(data.quantity) : 1,
        sort_order: 0,
        location_tag: data.locationTag || null,
        reason: data.workType as string,
        description: data.aiDescription,
      });

      // FC collaborator
      if (data.fcInputNeeded && data.fcOrgId) {
        await supabase.from('change_order_collaborators').insert({
          co_id: preGeneratedId,
          organization_id: data.fcOrgId,
          collaborator_type: 'FC',
          invited_by_user_id: user.id,
          status: 'invited',
        });
      }

      // Activity log
      await supabase.from('co_activity').insert({
        co_id: preGeneratedId,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: role,
        action: 'created',
        detail: title,
      });

      if (data.shareDraftNow) {
        await shareCO.mutateAsync(preGeneratedId);
      }

      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      toast.success('Work order created');
      handleClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setData({ ...INITIAL_DATA });
    onOpenChange(false);
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const body = (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {isMobile && (
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            <span className="text-[11px] font-medium text-primary">{currentStep.label}</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {!isMobile && (
          <nav className="w-56 shrink-0 border-r p-3 space-y-1 bg-accent/30">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors w-full',
                  i === step && 'bg-primary/10 text-foreground font-medium',
                  i < step && 'text-foreground hover:bg-muted/50 cursor-pointer',
                  i > step && 'text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                  i < step || i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>
                </div>
              </button>
            ))}
          </nav>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!isMobile && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{currentStep.label}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            )}

            {currentStep.key === 'work_type' && <StepWorkType data={data} onChange={update} />}
            {currentStep.key === 'scope' && <StepScopeDetails data={data} onChange={update} selectedWorkType={selectedWorkType} />}
            {currentStep.key === 'location' && (
              <StepLocation projectId={projectId} data={data} onChange={update} savedLocation={savedLocation} userId={user?.id} />
            )}
            {currentStep.key === 'resources' && <StepResources data={data} onChange={update} role={role} projectId={projectId} />}
            {currentStep.key === 'review' && (
              <StepReview data={data} onChange={update} selectedWorkType={selectedWorkType} generatingAI={generatingAI} onRegenerate={generateAIDescription} />
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-card px-4 sm:px-6 py-3">
            <Button variant="ghost" size="sm" disabled={submitting} onClick={step === 0 ? handleClose : handleBack}>
              {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !canAdvance()}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Work Order
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext} disabled={!canAdvance()}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[94vh] p-0 rounded-t-2xl overflow-hidden">
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col">
        <DialogTitle className="sr-only">New Work Order</DialogTitle>
        <DialogDescription className="sr-only">Create a new work order for this T&M project</DialogDescription>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-card">
          <div>
            <h2 className="text-lg font-semibold">New Work Order</h2>
            <p className="text-xs text-muted-foreground">{orgName} · Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('w-9 h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}

// ── Step 1: Work Type ────────────────────────────────
function StepWorkType({ data, onChange }: { data: TMWOData; onChange: (p: Partial<TMWOData>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">What type of work is this?</p>
      <div className="grid grid-cols-3 gap-3">
        {WORK_TYPES.map(wt => (
          <button
            key={wt.key}
            type="button"
            onClick={() => onChange({ workType: wt.key, subtypes: [], customSubtype: '' })}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center min-h-[90px]',
              data.workType === wt.key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <span className="text-2xl">{wt.icon}</span>
            <span className="text-sm font-semibold text-foreground">{wt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Scope Details ────────────────────────────
function StepScopeDetails({
  data, onChange, selectedWorkType,
}: {
  data: TMWOData; onChange: (p: Partial<TMWOData>) => void; selectedWorkType?: WorkTypeDef;
}) {
  function toggleSubtype(st: string) {
    const current = data.subtypes;
    onChange({
      subtypes: current.includes(st) ? current.filter(s => s !== st) : [...current, st],
    });
  }

  return (
    <div className="space-y-5">
      {selectedWorkType && selectedWorkType.subtypes.length > 0 && (
        <div className="space-y-3">
          <Label>What specifically? <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
          <div className="flex flex-wrap gap-2">
            {selectedWorkType.subtypes.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => toggleSubtype(st)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  data.subtypes.includes(st)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                )}
              >
                {data.subtypes.includes(st) && <Check className="h-3 w-3" />}
                {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedWorkType?.key === 'other' || !selectedWorkType) && (
        <div className="space-y-2">
          <Label>Describe the work type</Label>
          <Input
            value={data.customSubtype}
            onChange={e => onChange({ customSubtype: e.target.value })}
            placeholder="e.g. Custom millwork framing"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Size / Quantity <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={data.quantity}
          onChange={e => onChange({ quantity: e.target.value })}
          placeholder="e.g. 12 LF, 3 openings, 200 SF"
        />
      </div>

      <div className="space-y-2">
        <Label>Scope notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          value={data.scopeNotes}
          onChange={e => onChange({ scopeNotes: e.target.value })}
          placeholder="Describe what needs to be done in plain language…"
          rows={3}
        />
      </div>
    </div>
  );
}

// ── Step 3: Location ─────────────────────────────────
function StepLocation({
  projectId, data, onChange, savedLocation, userId,
}: {
  projectId: string; data: TMWOData; onChange: (p: Partial<TMWOData>) => void;
  savedLocation: string | null; userId?: string;
}) {
  function handleConfirm(tag: string) {
    onChange({ locationTag: tag });
    try {
      if (userId) localStorage.setItem(`${userId}_${projectId}_last_location`, tag);
    } catch {}
  }

  return (
    <div className="space-y-4">
      {data.locationTag ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <span>📍</span>
            <span className="text-sm font-medium text-foreground">{data.locationTag}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => onChange({ locationTag: '' })}>
              Change
            </Button>
          </div>
        </div>
      ) : (
        <VisualLocationPicker
          projectId={projectId}
          onConfirm={handleConfirm}
          savedLocation={savedLocation}
        />
      )}
    </div>
  );
}

// ── Step 4: Resources ────────────────────────────────
function StepResources({
  data, onChange, role, projectId,
}: {
  data: TMWOData; onChange: (p: Partial<TMWOData>) => void; role: COCreatedByRole; projectId: string;
}) {
  const { data: fcMembers = [] } = useQuery({
    queryKey: ['tmwo-fc-team', projectId],
    enabled: role === 'TC',
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('project_participants')
        .select('id, organization_id, role, organizations:organization_id(id, name)')
        .eq('project_id', projectId)
        .eq('invite_status', 'ACCEPTED');
      return (rows ?? [])
        .filter((r: any) => r.role === 'Field Crew' || r.role === 'FC')
        .map((r: any) => ({ org_id: r.organization_id, org_name: r.organizations?.name ?? 'Unknown' }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Materials */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Materials needed</p>
            <p className="text-xs text-muted-foreground">Does this work require materials?</p>
          </div>
          <Switch
            checked={data.materialsNeeded}
            onCheckedChange={v => onChange({ materialsNeeded: v, materialsResponsible: v ? (data.materialsResponsible ?? 'TC') : null })}
          />
        </div>
        {data.materialsNeeded && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <div className="flex gap-2">
              {(['TC', 'GC'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => onChange({ materialsResponsible: p })}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    data.materialsResponsible === p ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30',
                  )}
                >
                  {p} supplies
                </button>
              ))}
            </div>
            <Textarea
              value={data.materialNotes}
              onChange={e => onChange({ materialNotes: e.target.value })}
              placeholder="Material notes (optional)…"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Equipment needed</p>
            <p className="text-xs text-muted-foreground">Scaffolding, lifts, specialty tools?</p>
          </div>
          <Switch
            checked={data.equipmentNeeded}
            onCheckedChange={v => onChange({ equipmentNeeded: v, equipmentResponsible: v ? (data.equipmentResponsible ?? 'TC') : null })}
          />
        </div>
        {data.equipmentNeeded && (
          <div className="flex gap-2 pl-4 border-l-2 border-primary/20">
            {(['TC', 'GC'] as const).map(p => (
              <button
                key={p}
                onClick={() => onChange({ equipmentResponsible: p })}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                  data.equipmentResponsible === p ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30',
                )}
              >
                {p} provides
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Urgency */}
      <div className="space-y-3">
        <Label>Urgency</Label>
        <div className="flex gap-2">
          {(['Standard', 'Urgent', 'Emergency'] as const).map(u => (
            <button
              key={u}
              onClick={() => onChange({ urgency: u })}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all',
                data.urgency === u ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30',
                u === 'Emergency' && data.urgency === u && 'border-destructive bg-destructive/10 text-destructive',
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* FC input — TC only */}
      {role === 'TC' && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Field crew input needed</p>
              <p className="text-xs text-muted-foreground">They can add hours and notes</p>
            </div>
            <Switch checked={data.fcInputNeeded} onCheckedChange={v => onChange({ fcInputNeeded: v })} />
          </div>
          {data.fcInputNeeded && fcMembers.length > 0 && (
            <Select value={data.fcOrgId} onValueChange={v => onChange({ fcOrgId: v })}>
              <SelectTrigger><SelectValue placeholder="Select field crew" /></SelectTrigger>
              <SelectContent>
                {fcMembers.map((m: any) => <SelectItem key={m.org_id} value={m.org_id}>{m.org_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Share toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div>
          <p className="text-sm font-medium">Share immediately</p>
          <p className="text-xs text-muted-foreground">If off, stays as a private draft</p>
        </div>
        <Switch checked={data.shareDraftNow} onCheckedChange={v => onChange({ shareDraftNow: v })} />
      </div>
    </div>
  );
}

// ── Step 5: Review ───────────────────────────────────
function StepReview({
  data, onChange, selectedWorkType, generatingAI, onRegenerate,
}: {
  data: TMWOData; onChange: (p: Partial<TMWOData>) => void;
  selectedWorkType?: WorkTypeDef; generatingAI: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* AI-generated scope of work */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Scope of Work</Label>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={generatingAI} className="gap-1.5 h-7 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {generatingAI ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
        {generatingAI ? (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">AI is drafting your scope of work…</span>
          </div>
        ) : (
          <Textarea
            value={data.aiDescription}
            onChange={e => onChange({ aiDescription: e.target.value })}
            rows={6}
            placeholder="Scope of work description…"
          />
        )}
        <p className="text-[11px] text-muted-foreground">AI-drafted — edit freely before submitting.</p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
        <SummaryRow label="Work Type" value={selectedWorkType?.label ?? data.workType ?? '—'} />
        {data.subtypes.length > 0 && <SummaryRow label="Details" value={data.subtypes.join(', ')} />}
        {data.customSubtype && <SummaryRow label="Details" value={data.customSubtype} />}
        {data.quantity && <SummaryRow label="Quantity" value={data.quantity} />}
        {data.locationTag && <SummaryRow label="Location" value={data.locationTag} />}
        {data.materialsNeeded && <SummaryRow label="Materials" value={`${data.materialsResponsible} supplies`} />}
        {data.equipmentNeeded && <SummaryRow label="Equipment" value={`${data.equipmentResponsible} provides`} />}
        {data.urgency !== 'Standard' && <SummaryRow label="Urgency" value={data.urgency} />}
      </div>

      {/* Optional cost */}
      <div className="space-y-2">
        <Label>Estimated cost <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            value={data.estimatedCost}
            onChange={e => onChange({ estimatedCost: e.target.value })}
            className="pl-7"
            placeholder="0.00"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Internal estimate — can be updated later.</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
