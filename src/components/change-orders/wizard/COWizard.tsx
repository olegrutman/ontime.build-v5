import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateCONumber } from '@/lib/generateCONumber';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { VisualLocationPicker } from '../VisualLocationPicker';
import { StepCatalog } from './StepCatalog';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COCreatedByRole, COReasonCode, COPricingType, ScopeCatalogItem } from '@/types/changeOrder';
import {
  WORK_INTENT_LABELS,
  WORK_INTENT_DESCRIPTIONS,
  WORK_INTENT_ICONS,
  type WorkIntent,
} from '@/types/scopeQA';

// ── Types ──────────────────────────────────────────────
export interface SelectedScopeItem extends ScopeCatalogItem {
  locationTag: string;
  reason: COReasonCode;
  reasonDescription: string;
}

export type AssemblyState = 'pre_rough' | 'roughed' | 'sheathed_decked' | 'dried_in';
export type TriggerCode =
  | 'trade_conflict_mech'
  | 'trade_conflict_elec'
  | 'trade_conflict_plumb'
  | 'inspector_callback'
  | 'owner_request_change'
  | 'field_discovery'
  | 'design_revision';

export const TRIGGER_LABELS: Record<TriggerCode, string> = {
  trade_conflict_mech:  'Mechanical conflict',
  trade_conflict_elec:  'Electrical conflict',
  trade_conflict_plumb: 'Plumbing conflict',
  inspector_callback:   'Inspector callback',
  owner_request_change: 'Owner request',
  field_discovery:      'Field discovery',
  design_revision:      'Design revision',
};

export const ASSEMBLY_STATE_LABELS: Record<AssemblyState, string> = {
  pre_rough:        'Open framing',
  roughed:          'Framed, no sheathing',
  sheathed_decked:  'Sheathed / decked',
  dried_in:         'Dried in / finished',
};

export const ASSEMBLY_STATE_HINTS: Record<AssemblyState, string> = {
  pre_rough:        'No demo needed',
  roughed:          'Light demo only',
  sheathed_decked:  'Open up + repair sequence',
  dried_in:         'Demo + repair + finishes',
};

export interface COWizardData {
  /** Phase B — primary work-intent driver for Sasha's question flow */
  intent?: WorkIntent | null;
  reason: COReasonCode | null;
  workType: string | null;
  /** Phase 2 — what triggered this CO/WO (optional) */
  triggerCode?: TriggerCode | null;
  /** Phase 2 — state of the assembly when issue was found (optional, only relevant for framing zones) */
  assemblyState?: AssemblyState | null;
  locationTag: string;
  selectedItems: SelectedScopeItem[];
  pricingType: COPricingType;
  nteCap: string;
  gcBudget: string;
  assignedToOrgId: string;
  fcOrgId: string;
  fcInputNeeded: boolean;
  materialsNeeded: boolean;
  materialsOnSite: boolean;
  equipmentNeeded: boolean;
  materialsResponsible: 'GC' | 'TC' | null;
  equipmentResponsible: 'GC' | 'TC' | null;
  shareDraftNow: boolean;
  quickHours: number | null;
  aiDescription: string;
  /** Optional user-typed name for the CO/WO. When empty, the title is just `{co_number} · {date}`. */
  coName?: string;
  /** Per-line-item descriptions, keyed by selectedItems[i].id. Drives co_line_items.description. */
  itemDescriptions?: Record<string, string>;
  /** Phase 3 — structured answers from the QA flow, persisted as evidence */
  qaAnswers?: Record<string, string | string[]>;
}

const INITIAL_DATA: COWizardData = {
  intent: null,
  reason: null,
  workType: null,
  triggerCode: null,
  assemblyState: null,
  locationTag: '',
  selectedItems: [],
  pricingType: 'fixed',
  nteCap: '',
  gcBudget: '',
  assignedToOrgId: '',
  fcOrgId: '',
  fcInputNeeded: false,
  materialsNeeded: false,
  materialsOnSite: false,
  equipmentNeeded: false,
  materialsResponsible: null,
  equipmentResponsible: null,
  shareDraftNow: false,
  quickHours: null,
  aiDescription: '',
};

const REASON_CARDS: { reason: COReasonCode; label: string; description: string; icon: string; example: string }[] = [
  { reason: 'addition',          label: 'Extra scope',     description: 'Work not in original plan', icon: '➕', example: 'e.g. owner added a deck' },
  { reason: 'design_change',     label: 'Plan changed',    description: 'Drawings revised',           icon: '📐', example: 'e.g. new window opening' },
  { reason: 'damaged_by_others', label: 'Found damage',    description: 'Another trade caused it',    icon: '⚠️', example: 'e.g. plumber cut a joist' },
  { reason: 'rework',            label: 'Redo work',       description: 'Something built wrong',       icon: '🔄', example: 'e.g. wall framed crooked' },
  { reason: 'owner_request',     label: 'Owner request',   description: 'Owner asked for change',      icon: '👤', example: 'e.g. upgrade finishes' },
  { reason: 'gc_request',        label: 'GC request',      description: 'GC directed the change',      icon: '🏗️', example: 'e.g. add fire blocking' },
  { reason: 'other',             label: 'Other',           description: 'Something else',              icon: '📝', example: '' },
];

// Work type definitions (matching TMWOWizard pattern)
interface WorkTypeDef {
  key: string;
  label: string;
  icon: string;
}

const CO_WORK_TYPES: WorkTypeDef[] = [
  { key: 'framing', label: 'Framing', icon: '🏗️' },
  { key: 'structural', label: 'Structural', icon: '⚙️' },
  { key: 'wrb', label: 'WRB & Envelope', icon: '🛡️' },
  { key: 'electrical', label: 'Electrical', icon: '⚡' },
  { key: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { key: 'hvac', label: 'HVAC', icon: '❄️' },
  { key: 'exterior', label: 'Exterior', icon: '🏠' },
  { key: 'finish', label: 'Finish Work', icon: '🎨' },
  { key: 'demolition', label: 'Demolition', icon: '🔨' },
  { key: 'other', label: 'Other', icon: '📝' },
];

// Pricing options moved to SharedWizardComponents
import { PricingTypeSelector, ToggleWithSelector, ShareToggle } from './SharedWizardComponents';

const STEPS = [
  { key: 'why', label: 'Why', description: 'Reason & work type' },
  { key: 'where', label: 'Where', description: 'Location of the work' },
  { key: 'scope', label: 'Scope', description: 'Select work items' },
  { key: 'how', label: 'How', description: 'Pricing & configuration' },
  { key: 'review', label: 'Review', description: 'Confirm & create' },
] as const;

interface COWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  preSelectedReason?: COReasonCode;
  isTM?: boolean;
}

export function COWizard({ open, onOpenChange, projectId, preSelectedReason, isTM = false }: COWizardProps) {
  const { currentRole, user, userOrgRoles } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<COWizardData>({
    ...INITIAL_DATA,
    pricingType: isTM ? 'tm' : INITIAL_DATA.pricingType,
    reason: preSelectedReason ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const { shareCO } = useChangeOrders(projectId);

  // ── Draft autosave (sessionStorage) ──────────────────
  const draftKey = `co_wizard_draft_${projectId}_${isTM ? 'wo' : 'co'}`;
  const [draftMeta, setDraftMeta] = useState<{ ts: number; step: number } | null>(null);
  const hydratedRef = useRef(false);

  // Detect existing draft when wizard opens
  useEffect(() => {
    if (!open || hydratedRef.current) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.ts && parsed?.data) {
          setDraftMeta({ ts: parsed.ts, step: parsed.step ?? 0 });
        }
      }
    } catch {/* ignore */}
  }, [open, draftKey]);

  // Persist on every change (only after first user interaction past step 0)
  useEffect(() => {
    if (!open) return;
    const isPristine =
      step === 0 &&
      !data.reason &&
      !data.locationTag &&
      data.selectedItems.length === 0 &&
      !data.aiDescription;
    if (isPristine) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ ts: Date.now(), step, data }));
    } catch {/* quota / private mode */}
  }, [open, step, data, draftKey]);

  function resumeDraft() {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        setData({ ...INITIAL_DATA, ...parsed.data });
        setStep(parsed.step ?? 0);
      }
    } catch {/* ignore */}
    setDraftMeta(null);
    hydratedRef.current = true;
  }

  function discardDraft() {
    try { sessionStorage.removeItem(draftKey); } catch {/* ignore */}
    setDraftMeta(null);
    hydratedRef.current = true;
  }

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const role: COCreatedByRole =
    currentRole === 'GC_PM' ? 'GC' : currentRole === 'TC_PM' ? 'TC' : 'FC';
  const orgName = (userOrgRoles?.[0] as any)?.organization?.name ?? role;

  // Project name + scope context for AI
  const { data: project } = useQuery({
    queryKey: ['project-name-co', projectId],
    queryFn: async () => {
      const { data: p } = await supabase.from('projects').select('name').eq('id', projectId).single();
      return p;
    },
  });

  const { data: projectScope } = useQuery({
    queryKey: ['project-scope-co', projectId],
    queryFn: async () => {
      const { data: s } = await supabase
        .from('project_scope_details')
        .select('home_type, framing_method, floors, total_sqft, construction_type')
        .eq('project_id', projectId)
        .maybeSingle();
      return s;
    },
  });

  function update(patch: Partial<COWizardData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  // Saved location shortcut
  const savedLocation = (() => {
    try { return localStorage.getItem(`${user?.id}_${projectId}_last_location`); }
    catch { return null; }
  })();

  const selectedWorkType = CO_WORK_TYPES.find(w => w.key === data.workType);

  function canAdvance(): boolean {
    const s = STEPS[step];
    if (s.key === 'why') return !!data.intent && !!data.reason;
    if (s.key === 'where') return !!data.locationTag;
    if (s.key === 'scope') return data.selectedItems.length > 0;
    if (s.key === 'how') {
      if (role === 'GC' && !data.assignedToOrgId) return false;
      if (data.pricingType === 'nte' && (!data.nteCap || parseFloat(data.nteCap) <= 0)) return false;
      return true;
    }
    if (s.key === 'review') return data.selectedItems.length > 0;
    return true;
  }

  async function generateAIDescription() {
    setGeneratingAI(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('generate-work-order-description', {
        body: {
          work_type: data.workType || data.reason,
          location_tag: data.locationTag || '',
          project_name: project?.name ?? 'Project',
          project_context: projectScope ?? undefined,
          selected_items: data.selectedItems.map(i => ({
            name: i.item_name,
            qty: i.qty ?? null,
            unit: i.unit ?? null,
            category: i.category_name ?? null,
          })),
          reason_code: data.reason || '',
          trigger_code: data.triggerCode ?? undefined,
          assembly_state: data.assemblyState ?? undefined,
          requires_materials: data.materialsNeeded,
          requires_equipment: data.equipmentNeeded,
          material_responsibility: data.materialsResponsible,
          equipment_responsibility: data.equipmentResponsible,
        },
      });
      if (error) throw error;
      if (resp?.description) {
        update({ aiDescription: resp.description });
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      // Fallback: manual description grouped by category
      const grouped = new Map<string, string[]>();
      for (const i of data.selectedItems) {
        const cat = i.category_name || 'General';
        if (!grouped.has(cat)) grouped.set(cat, []);
        const qtyStr = i.qty ? ` (${i.qty}${i.unit ? ` ${i.unit}` : ''})` : '';
        grouped.get(cat)!.push(`${i.item_name}${qtyStr}`);
      }
      const itemPhrases = Array.from(grouped.entries())
        .map(([c, names]) => `${c}: ${names.join(', ')}`)
        .join('; ');
      const parts = [
        `Scope at ${data.locationTag || 'TBD'} for ${project?.name ?? 'the project'}.`,
        itemPhrases ? `Includes ${itemPhrases}.` : '',
        data.reason ? `Reason: ${CO_REASON_LABELS[data.reason] ?? data.reason}.` : '',
      ].filter(Boolean);
      update({ aiDescription: parts.join(' ') });
    } finally {
      setGeneratingAI(false);
    }
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

  async function handleSubmit() {
    if (!orgId || !user) { toast.error('Not authenticated'); return; }
    setSubmitting(true);
    try {
      // Auto-resolve assigned org for TC/FC (needed before generating CO number)
      let resolvedAssignedToOrgId = data.assignedToOrgId || null;
      if (!resolvedAssignedToOrgId && role === 'FC') {
        const { data: fcContract } = await supabase
          .from('project_contracts')
          .select('to_org_id')
          .eq('project_id', projectId)
          .eq('from_org_id', orgId)
          .single();
        if (fcContract?.to_org_id) {
          resolvedAssignedToOrgId = fcContract.to_org_id;
        } else {
          const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
          resolvedAssignedToOrgId = proj?.organization_id ?? null;
        }
      } else if (!resolvedAssignedToOrgId && role === 'TC') {
        // Try to find the GC on this project first
        const { data: gcParticipant } = await supabase
          .from('project_participants')
          .select('organization_id')
          .eq('project_id', projectId)
          .eq('role', 'GC')
          .eq('invite_status', 'ACCEPTED')
          .limit(1)
          .maybeSingle();

        if (gcParticipant?.organization_id) {
          resolvedAssignedToOrgId = gcParticipant.organization_id;
        } else {
          const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
          resolvedAssignedToOrgId = proj?.organization_id ?? null;
        }
      }

      const coNumber = await generateCONumber({ projectId, creatorOrgId: orgId, assignedToOrgId: resolvedAssignedToOrgId, isTM });
      const intentLabel = data.intent ? WORK_INTENT_LABELS[data.intent] : (selectedWorkType?.label ?? '');
      const title = `${coNumber} · ${intentLabel ? intentLabel + ' · ' : ''}${format(new Date(), 'MMM d, yyyy')}`;
      const preGeneratedId = crypto.randomUUID();

      // resolvedAssignedToOrgId already computed above for CO number generation

      const { error: insertError } = await supabase
        .from('change_orders')
        .insert({
          id: preGeneratedId,
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: role,
          title,
          co_number: coNumber,
          status: 'draft',
          pricing_type: data.pricingType,
          nte_cap: data.pricingType === 'nte' && data.nteCap ? parseFloat(data.nteCap) : null,
          gc_budget: data.gcBudget ? parseFloat(data.gcBudget) : null,
          reason: data.reason,
          reason_note: data.aiDescription || null,
          location_tag: data.locationTag || null,
          assigned_to_org_id: resolvedAssignedToOrgId,
          fc_input_needed: data.fcInputNeeded,
          materials_needed: data.materialsNeeded,
          materials_on_site: data.materialsOnSite,
          equipment_needed: data.equipmentNeeded,
          materials_responsible: data.materialsResponsible,
          equipment_responsible: data.equipmentResponsible,
          draft_shared_with_next: data.shareDraftNow,
        });
      if (insertError) throw insertError;

      // Insert scope items (Phase 4: persist AI quantity/confidence/reasoning)
      if (data.selectedItems.length > 0) {
        const rows = data.selectedItems.map((item, idx) => ({
          co_id: preGeneratedId,
          org_id: orgId,
          created_by_role: role,
          catalog_item_id: /^[0-9a-f]{8}-/.test(item.id) ? item.id : null,
          item_name: item.item_name,
          division: item.division,
          category_name: item.category_name,
          unit: item.unit,
          qty: item.qty ?? null,
          quantity_source: item.quantity_source ?? null,
          ai_confidence: item.ai_confidence ?? null,
          ai_reasoning: item.ai_reasoning ?? null,
          sort_order: idx,
          location_tag: data.locationTag || null,
          reason: (data.reason || null) as string | null,
          description: item.reasonDescription || null,
        }));
        const { data: insertedRows, error: lineError } = await supabase
          .from('co_line_items')
          .insert(rows)
          .select('id');
        if (lineError) {
          await supabase.from('change_orders').delete().eq('id', preGeneratedId);
          throw new Error(`Failed to save scope items: ${lineError.message}`);
        }

        // Phase 4b: write a qa_answer evidence row per line item when QA was used
        if (data.qaAnswers && Object.keys(data.qaAnswers).length > 0 && insertedRows?.length) {
          const caption = data.aiDescription || JSON.stringify(data.qaAnswers);
          const evidenceRows = insertedRows.map((r) => ({
            co_line_item_id: r.id,
            co_id: preGeneratedId,
            kind: 'qa_answer',
            caption,
            ai_model: 'google/gemini-2.5-flash',
            confidence: null,
            created_by: user.id,
          }));
          // Best-effort; don't fail CO creation if evidence write hiccups
          await supabase.from('co_scope_evidence').insert(evidenceRows);
        }
      }

      // Create collaborator rows with 'invited' status
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
      toast.success(isTM ? 'Work order created' : 'Change order created');
      // Clear any saved draft after successful submit
      try { sessionStorage.removeItem(draftKey); } catch {/* ignore */}
      hydratedRef.current = true;
      handleClose();
    } catch (err: any) {
      toast.error(err?.message ?? (isTM ? 'Failed to create work order' : 'Failed to create change order'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setData({ ...INITIAL_DATA, pricingType: isTM ? 'tm' : INITIAL_DATA.pricingType, reason: preSelectedReason ?? null });
    setDraftMeta(null);
    hydratedRef.current = false;
    onOpenChange(false);
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const body = (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Resume-draft banner */}
      {draftMeta && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-4 py-2 flex items-center gap-2 text-xs">
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            Draft from {formatDraftAge(draftMeta.ts)} (Step {draftMeta.step + 1})
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={discardDraft}>
              Start fresh
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={resumeDraft}>
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* Mobile step indicator */}
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
        {/* Desktop nav (only on very wide screens — chips in header carry context elsewhere) */}
        {!isMobile && (
          <nav className="hidden xl:flex xl:flex-col w-48 shrink-0 border-r p-2 gap-0.5 bg-accent/30">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors w-full',
                  i === step && 'bg-primary/10 text-foreground font-medium',
                  i < step && 'text-foreground hover:bg-muted/50 cursor-pointer',
                  i > step && 'text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0',
                  i < step || i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px]">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                </div>
              </button>
            ))}
          </nav>
        )}

        {/* Step content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {!isMobile && (
              <div className="mb-3 xl:hidden">
                <h3 className="text-base font-semibold leading-tight">{currentStep.label}</h3>
                <p className="text-xs text-muted-foreground">{currentStep.description}</p>
              </div>
            )}

            {currentStep.key === 'why' && <StepWhy data={data} onChange={update} isTM={isTM} />}
            {currentStep.key === 'where' && (
              <StepWhere
                projectId={projectId}
                data={data}
                onChange={update}
                savedLocation={savedLocation}
                userId={user?.id}
              />
            )}
            {currentStep.key === 'scope' && <StepCatalog data={data} onChange={update} projectId={projectId} intent={data.intent ?? null} />}
            {currentStep.key === 'how' && <StepHow data={data} onChange={update} role={role} projectId={projectId} />}
            {currentStep.key === 'review' && (
              <StepReview
                data={data}
                onChange={update}
                role={role}
                isTM={isTM}
                projectId={projectId}
                generatingAI={generatingAI}
                onRegenerate={generateAIDescription}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-card px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button variant="ghost" size="sm" disabled={submitting} onClick={step === 0 ? handleClose : handleBack}>
              {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !canAdvance()}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create {isTM ? 'Work Order' : 'Change Order'}
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
      <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">New {isTM ? 'Work Order' : 'Change Order'}</DialogTitle>
        <DialogDescription className="sr-only">Create a new {isTM ? 'work order' : 'change order'}</DialogDescription>
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b shrink-0 bg-card">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">New {isTM ? 'Work Order' : 'Change Order'}</h2>
            <p className="text-[11px] text-muted-foreground truncate">{orgName} · Step {step + 1} of {STEPS.length}{currentStep ? ` · ${currentStep.label}` : ''}</p>
          </div>
          {/* Context chips: intent + reason + location — uniform neutral styling */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0 justify-center">
            {data.intent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-medium whitespace-nowrap">
                <span aria-hidden>{WORK_INTENT_ICONS[data.intent]}</span>
                {WORK_INTENT_LABELS[data.intent]}
              </span>
            )}
            {data.reason && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-medium whitespace-nowrap">
                {CO_REASON_COLORS[data.reason] && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: CO_REASON_COLORS[data.reason].text }}
                    aria-hidden
                  />
                )}
                {CO_REASON_LABELS[data.reason]}
              </span>
            )}
            {data.locationTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-medium max-w-[260px]">
                <span aria-hidden>📍</span>
                <span className="truncate">{data.locationTag}</span>
              </span>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('w-7 h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}

// Order shown in the picker. Top row = most common, bottom row = specialty.
const INTENT_ORDER: WorkIntent[] = [
  'repair_damage',
  'add_new',
  'modify_existing',
  'redo_work',
  'tear_out',
  'envelope_work',
  'structural_install',
  'mep_blocking',
  'inspection_fix',
  'other',
];

// Soft suggestion: when a reason is picked first, surface the intent that
// usually goes with it. The user can still override.
const REASON_TO_INTENT_HINT: Partial<Record<COReasonCode, WorkIntent>> = {
  damaged_by_others: 'repair_damage',
  rework: 'redo_work',
  design_change: 'modify_existing',
  addition: 'add_new',
  owner_request: 'add_new',
  gc_request: 'add_new',
  other: 'other',
};

// ── Step 1: Why ──────────────────────────────────────
function StepWhy({ data, onChange, isTM = false }: { data: COWizardData; onChange: (p: Partial<COWizardData>) => void; isTM?: boolean }) {
  function pickReason(reason: COReasonCode) {
    // If no intent yet, pre-select the typical intent for this reason as a hint
    const hint = REASON_TO_INTENT_HINT[reason];
    onChange({ reason, intent: data.intent ?? hint ?? null });
  }

  return (
    <div className="space-y-6">
      {/* ── Primary: Work intent picker ─────────────────── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-foreground">
            What kind of work is this?
          </p>
          <span className="text-[11px] text-muted-foreground">Drives Sasha's questions</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {INTENT_ORDER.map(key => {
            const active = data.intent === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ intent: key })}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all text-left min-h-[78px]',
                  active
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40',
                )}
                aria-pressed={active}
              >
                <span className="text-base leading-none">{WORK_INTENT_ICONS[key]}</span>
                <span className="text-[13px] font-semibold text-foreground leading-tight">
                  {WORK_INTENT_LABELS[key]}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug">
                  {WORK_INTENT_DESCRIPTIONS[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Secondary: Reason (kept for filing / reporting) ─ */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-foreground">
            Why is this {isTM ? 'work order' : 'change order'} happening?
          </p>
          <span className="text-[11px] text-muted-foreground">For tracking & approvals</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REASON_CARDS.map(card => {
            const active = data.reason === card.reason;
            return (
              <button
                key={card.reason}
                type="button"
                onClick={() => pickReason(card.reason)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-left',
                  active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
                )}
                aria-pressed={active}
              >
                <span className="text-base leading-none">{card.icon}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{card.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {data.intent && data.reason && (
        <p className="text-[11px] text-muted-foreground italic">
          ✦ Sasha will use <span className="font-medium not-italic">{WORK_INTENT_LABELS[data.intent]}</span> to ask the right questions in Step 3.
        </p>
      )}
    </div>
  );
}

// ── Step 2: Where ────────────────────────────────────
const RECENT_LOCATIONS_KEY = (uid: string, pid: string) => `${uid}_${pid}_recent_locations`;
const MAX_RECENT_LOCATIONS = 6;

function readRecentLocations(userId: string | undefined, projectId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY(userId, projectId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : [];
  } catch { return []; }
}

function pushRecentLocation(userId: string | undefined, projectId: string, tag: string) {
  if (!userId || !tag) return;
  try {
    const existing = readRecentLocations(userId, projectId);
    const next = [tag, ...existing.filter(x => x !== tag)].slice(0, MAX_RECENT_LOCATIONS);
    localStorage.setItem(RECENT_LOCATIONS_KEY(userId, projectId), JSON.stringify(next));
  } catch {/* quota */}
}

function StepWhere({
  projectId, data, onChange, savedLocation, userId,
}: {
  projectId: string;
  data: COWizardData;
  onChange: (p: Partial<COWizardData>) => void;
  savedLocation: string | null;
  userId?: string;
}) {
  const recent = useMemo(() => readRecentLocations(userId, projectId), [userId, projectId]);

  function handleConfirm(tag: string) {
    onChange({ locationTag: tag });
    try {
      if (userId) localStorage.setItem(`${userId}_${projectId}_last_location`, tag);
    } catch {}
    pushRecentLocation(userId, projectId, tag);
  }

  if (data.locationTag) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <span>📍</span>
          <span className="text-sm font-medium text-foreground">{data.locationTag}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => onChange({ locationTag: '' })}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent locations
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleConfirm(tag)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-card hover:border-primary hover:bg-primary/5 text-xs text-foreground transition-colors max-w-[280px]"
                title={tag}
              >
                <span aria-hidden>📍</span>
                <span className="truncate">{tag}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Tap to reuse, or pick a new spot below.</p>
        </div>
      )}
      <VisualLocationPicker
        projectId={projectId}
        onConfirm={handleConfirm}
        savedLocation={savedLocation}
      />
    </div>
  );
}

// ── Step 3: Scope ────────────────────────────────────
// Uses StepCatalog directly

// ── Step 4: How ──────────────────────────────────────
function StepHow({
  data, onChange, role, projectId,
}: {
  data: COWizardData;
  onChange: (p: Partial<COWizardData>) => void;
  role: COCreatedByRole;
  projectId: string;
}) {
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['co-wizard-team', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('project_participants')
        .select('id, organization_id, role, organizations:organization_id(id, name)')
        .eq('project_id', projectId)
        .eq('invite_status', 'ACCEPTED');
      return (rows ?? []).map((r: any) => ({
        id: r.id,
        org_id: r.organization_id,
        org_name: r.organizations?.name ?? 'Unknown',
        role: r.role ?? '',
      }));
    },
  });

  const tcMembers = teamMembers.filter(m => m.role === 'Trade Contractor' || m.role === 'TC');
  const fcMembers = teamMembers.filter(m => m.role === 'Field Crew' || m.role === 'FC');

  // GC config
  if (role === 'GC') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Assign to *</Label>
          <Select value={data.assignedToOrgId} onValueChange={v => onChange({ assignedToOrgId: v })}>
            <SelectTrigger><SelectValue placeholder="Select a trade contractor" /></SelectTrigger>
            <SelectContent>
              {tcMembers.map(m => <SelectItem key={m.org_id} value={m.org_id}>{m.org_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <PricingTypeSelector pricingType={data.pricingType} nteCap={data.nteCap} onPricingTypeChange={v => onChange({ pricingType: v })} onNteCapChange={v => onChange({ nteCap: v })} />

        <div className="space-y-1.5">
          <Label>Your budget (internal)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input type="number" value={data.gcBudget} onChange={e => onChange({ gcBudget: e.target.value })} className="pl-7" placeholder="0.00" />
          </div>
          <p className="text-xs text-muted-foreground">Private — not visible to TC or FC</p>
        </div>

        <div className="space-y-4">
          <ToggleWithSelector
            label="Materials needed"
            hint="Track materials on this CO"
            checked={data.materialsNeeded}
            onToggle={v => onChange({ materialsNeeded: v, materialsResponsible: v ? (data.materialsResponsible ?? 'TC') : null })}
            party={data.materialsResponsible}
            onPartyChange={v => onChange({ materialsResponsible: v })}
          />
          <ToggleWithSelector
            label="Equipment needed"
            hint="Track equipment costs"
            checked={data.equipmentNeeded}
            onToggle={v => onChange({ equipmentNeeded: v, equipmentResponsible: v ? (data.equipmentResponsible ?? 'TC') : null })}
            party={data.equipmentResponsible}
            onPartyChange={v => onChange({ equipmentResponsible: v })}
          />
        </div>

        <ShareToggle value={data.shareDraftNow} onChange={v => onChange({ shareDraftNow: v })} />
      </div>
    );
  }

  // TC config
  if (role === 'TC') {
    return (
      <div className="space-y-6">
        <PricingTypeSelector pricingType={data.pricingType} nteCap={data.nteCap} onPricingTypeChange={v => onChange({ pricingType: v })} onNteCapChange={v => onChange({ nteCap: v })} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Field crew input needed</p>
              <p className="text-xs text-muted-foreground">They can add hours and notes</p>
            </div>
            <Switch checked={data.fcInputNeeded} onCheckedChange={v => onChange({ fcInputNeeded: v })} />
          </div>
          {data.fcInputNeeded && (
            <Select value={data.fcOrgId} onValueChange={v => onChange({ fcOrgId: v })}>
              <SelectTrigger><SelectValue placeholder="Select field crew" /></SelectTrigger>
              <SelectContent>
                {fcMembers.map(m => <SelectItem key={m.org_id} value={m.org_id}>{m.org_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <ShareToggle value={data.shareDraftNow} onChange={v => onChange({ shareDraftNow: v })} />
      </div>
    );
  }

  // FC config
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Quick log hours (optional)</Label>
        <div className="flex gap-2">
          {[2, 4, 8].map(h => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ quickHours: data.quickHours === h ? null : h })}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all',
                data.quickHours === h ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30',
              )}
            >
              {h}h
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ quickHours: data.quickHours && ![2, 4, 8].includes(data.quickHours) ? null : -1 })}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all',
              data.quickHours === -1 ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30',
            )}
          >
            Custom
          </button>
        </div>
      </div>

      <ShareToggle value={data.shareDraftNow} onChange={v => onChange({ shareDraftNow: v })} label="Share with TC immediately" />
    </div>
  );
}

// ── Step 5: Review (with AI description) ─────────────
function StepReview({
  data, onChange, role, isTM, projectId, generatingAI, onRegenerate,
}: {
  data: COWizardData;
  onChange: (p: Partial<COWizardData>) => void;
  role: COCreatedByRole;
  isTM: boolean;
  projectId: string;
  generatingAI: boolean;
  onRegenerate: () => void;
}) {
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  // Snapshot the item IDs at the time the add-dialog opens so we can detect newly added items
  const itemCountRef = useRef(data.selectedItems.length);
  // When the item set length changes (after initial render), auto-regenerate description
  useEffect(() => {
    if (itemCountRef.current !== data.selectedItems.length) {
      itemCountRef.current = data.selectedItems.length;
      // Only auto-regen if not currently generating; respect manual edits by always replacing
      // (user can still edit afterwards). Debounce a tick so onChange settles.
      const t = setTimeout(() => onRegenerate(), 300);
      return () => clearTimeout(t);
    }
  }, [data.selectedItems.length, onRegenerate]);

  const { data: assignedOrg } = useQuery({
    queryKey: ['org-name', data.assignedToOrgId],
    enabled: !!data.assignedToOrgId,
    queryFn: async () => {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', data.assignedToOrgId).single();
      return org?.name ?? '';
    },
  });

  const { data: fcOrgName } = useQuery({
    queryKey: ['org-name', data.fcOrgId],
    enabled: !!data.fcOrgId,
    queryFn: async () => {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', data.fcOrgId).single();
      return org?.name ?? '';
    },
  });

  const participants = [
    { role: role, name: 'You (Creator)', status: 'Owner' },
    ...(data.assignedToOrgId ? [{ role: 'TC' as const, name: assignedOrg ?? '...', status: data.shareDraftNow ? 'Will be notified' : 'Draft — not shared' }] : []),
    ...(data.fcOrgId ? [{ role: 'FC' as const, name: fcOrgName ?? '...', status: 'Will be invited' }] : []),
  ];

  const COLORS: Record<string, string> = { GC: 'bg-blue-500', TC: 'bg-emerald-500', FC: 'bg-amber-500' };

  const selectedWorkType = CO_WORK_TYPES.find(w => w.key === data.workType);

  return (
    <div className="space-y-5">
      {/* AI-generated scope description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Scope Description</Label>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={generatingAI} className="gap-1.5 h-7 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {generatingAI ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
        {generatingAI ? (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">AI is drafting your scope description…</span>
          </div>
        ) : (
          <Textarea
            value={data.aiDescription}
            onChange={e => onChange({ aiDescription: e.target.value })}
            rows={4}
            placeholder="Scope description…"
          />
        )}
        <p className="text-[11px] text-muted-foreground">AI-drafted — edit freely before creating.</p>
      </div>

      {/* Scope items — editable */}
      {data.selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Scope items <span className="font-normal text-muted-foreground/70">· {data.selectedItems.length}</span>
          </p>
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y">
            {data.selectedItems.map((item, idx) => {
              const sourceBadge = item.quantity_source === 'ai'
                ? { label: '✦ Sasha', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' }
                : item.quantity_source === 'manual'
                ? { label: '✎ Manual', cls: 'bg-muted text-foreground' }
                : { label: '☰ Browse', cls: 'bg-secondary text-secondary-foreground' };
              return (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.item_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.category_name}</p>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    aria-label={`Quantity for ${item.item_name}`}
                    value={item.qty ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = raw === '' ? null : Number(raw);
                      if (num != null && Number.isNaN(num)) return;
                      const next = [...data.selectedItems];
                      next[idx] = { ...item, qty: num, quantity_source: num != null ? 'manual' : null };
                      onChange({ selectedItems: next });
                    }}
                    placeholder="—"
                    className="w-16 text-right rounded border border-border bg-background px-1.5 py-1 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 shrink-0">{item.unit}</span>
                  <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0', sourceBadge.cls)}>
                    {sourceBadge.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ selectedItems: data.selectedItems.filter((_, i) => i !== idx) });
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label={`Remove ${item.item_name}`}
                  >
                    <Sparkles className="h-3.5 w-3.5 opacity-0" />
                    <span className="text-base leading-none">×</span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground flex-1">
              Tap a quantity to override Sasha's estimate. Source badge will flip to <span className="font-semibold">Manual</span>.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 shrink-0"
              onClick={() => setAddItemsOpen(true)}
            >
              + Add more items
            </Button>
          </div>
        </div>
      )}

      {/* Add-more-items dialog */}
      <Dialog open={addItemsOpen} onOpenChange={setAddItemsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Add more scope items</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {data.locationTag ? `Location: ${data.locationTag}` : 'Pick additional items for this CO/WO.'}
            </DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            <StepCatalog data={data} onChange={onChange} projectId={projectId} intent={data.intent ?? null} />
          </div>
          <div className="flex items-center justify-end border-t px-4 sm:px-6 py-3 shrink-0 bg-card">
            <Button size="sm" onClick={() => setAddItemsOpen(false)}>
              Done · {data.selectedItems.length} total
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</p>
        {participants.map((p, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white', COLORS[p.role] ?? 'bg-muted')}>
              {p.role.charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.role}</p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.status}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
        {data.reason && (
          <SummaryRow label="Reason" value={CO_REASON_LABELS[data.reason]} />
        )}
        {selectedWorkType && (
          <SummaryRow label="Work Type" value={selectedWorkType.label} />
        )}
        {data.locationTag && (
          <SummaryRow label="Location" value={data.locationTag} />
        )}
        <SummaryRow label="Pricing" value={
          data.pricingType === 'fixed' ? 'Fixed Price' : data.pricingType === 'tm' ? 'Time & Material' : `Not-to-Exceed${data.nteCap ? ` · $${parseFloat(data.nteCap).toLocaleString()}` : ''}`
        } />
        {data.selectedItems.length > 0 && (
          <SummaryRow label="Scope" value={`${data.selectedItems.length} items`} />
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// PricingTypeSelector, ToggleWithSelector, ShareToggle moved to SharedWizardComponents.tsx

// ── Draft helpers ───────────────────────────────────────
function formatDraftAge(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
