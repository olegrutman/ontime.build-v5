import { useState, useEffect, useMemo } from 'react';
import { Plus, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { sendCONotification, buildCONotification } from '@/lib/coNotifications';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { StepCatalog } from './wizard/StepCatalog';
import { StepWhy, StepWhere, StepReview } from './wizard/COWizard';
import type { COCreatedByRole, ChangeOrder, COReasonCode } from '@/types/changeOrder';
import type { COWizardData } from './wizard/COWizard';
import { WORK_INTENT_LABELS } from '@/types/scopeQA';

interface AddScopeItemButtonProps {
  coId: string;
  orgId: string;
  projectId: string;
  role: COCreatedByRole;
  co: ChangeOrder;
  collaborators: { organization_id: string; status: string }[];
  onAdded: () => void;
  isTM?: boolean;
}

const ADD_STEPS = [
  { key: 'why',    label: 'Why',    description: 'Reason & work intent' },
  { key: 'where',  label: 'Where',  description: 'Location of the work' },
  { key: 'scope',  label: 'Scope',  description: 'Pick work items' },
  { key: 'review', label: 'Review', description: 'Confirm descriptions' },
] as const;

function buildEmptyWizard(co: ChangeOrder): COWizardData {
  return {
    intent: null,
    // Suggest the parent CO's reason/location as defaults — user can change them.
    reason: (co.reason as COReasonCode) ?? null,
    workType: null,
    triggerCode: null,
    assemblyState: null,
    locationTag: co.location_tag ?? '',
    selectedItems: [],
    pricingType: co.pricing_type ?? 'fixed',
    nteCap: '',
    gcBudget: '',
    assignedToOrgId: co.assigned_to_org_id ?? '',
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
    coName: '',
    itemDescriptions: {},
    qaAnswers: {},
  };
}

export function AddScopeItemButton({
  coId, orgId, projectId, role, co, collaborators, onAdded, isTM = false,
}: AddScopeItemButtonProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<COWizardData>(() => buildEmptyWizard(co));
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project-name', projectId],
    enabled: !!projectId && open,
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('name').eq('id', projectId).single();
      return data;
    },
  });

  function update(patch: Partial<COWizardData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  function resetAndClose() {
    setData(buildEmptyWizard(co));
    setStep(0);
    setOpen(false);
  }

  const currentStep = ADD_STEPS[step];
  const isLastStep = step === ADD_STEPS.length - 1;

  function canAdvance(): boolean {
    if (currentStep.key === 'why')    return !!data.intent && !!data.reason;
    if (currentStep.key === 'where')  return !!data.locationTag;
    if (currentStep.key === 'scope')  return data.selectedItems.length > 0;
    if (currentStep.key === 'review') return data.selectedItems.length > 0;
    return true;
  }

  async function generateAIDescription() {
    setGeneratingAI(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('generate-work-order-description', {
        body: {
          mode: 'per_item',
          work_type: data.workType || data.reason,
          location_tag: data.locationTag || '',
          project_name: project?.name ?? 'Project',
          intent: data.intent ?? null,
          intent_label: data.intent ? WORK_INTENT_LABELS[data.intent] : null,
          qa_answers: data.qaAnswers ?? {},
          selected_items: data.selectedItems.map(i => ({
            id: i.id,
            name: i.item_name,
            qty: i.qty ?? null,
            unit: i.unit ?? null,
            category: i.category_name ?? null,
            combined: !!i.isCombined,
            sub_items: i.isCombined && i.combinedFrom
              ? i.combinedFrom.map(s => ({
                  name: s.item_name,
                  qty: s.qty ?? null,
                  unit: s.unit ?? null,
                  category: s.category_name ?? null,
                }))
              : undefined,
          })),
          reason_code: data.reason || '',
          trigger_code: data.triggerCode ?? undefined,
          assembly_state: data.assemblyState ?? undefined,
        },
      });
      if (error) throw error;
      if (resp?.items && Array.isArray(resp.items)) {
        const map: Record<string, string> = {};
        for (const r of resp.items) {
          if (r?.id && typeof r.description === 'string') map[r.id] = r.description;
        }
        update({ itemDescriptions: map, aiDescription: resp.summary || '' });
      } else if (resp?.description) {
        update({ aiDescription: resp.description });
      }
    } catch (err) {
      // Local fallback
      const map: Record<string, string> = {};
      const intentLabel = data.intent ? WORK_INTENT_LABELS[data.intent] : '';
      const where = data.locationTag || 'TBD';
      for (const i of data.selectedItems) {
        const qtyStr = i.qty ? ` (${i.qty}${i.unit ? ` ${i.unit}` : ''})` : '';
        if (i.isCombined && i.combinedFrom?.length) {
          const subList = i.combinedFrom
            .map(s => `• ${s.item_name}${s.qty ? ` (${s.qty}${s.unit ? ` ${s.unit}` : ''})` : ''}`)
            .join('\n');
          map[i.id] = `Combined scope at ${where}${intentLabel ? ` — ${intentLabel.toLowerCase()}` : ''}, covering ${i.combinedFrom.length} related items.\n${subList}`;
        } else {
          map[i.id] = `${i.item_name}${qtyStr} at ${where}${intentLabel ? ` — ${intentLabel.toLowerCase()}` : ''}.`;
        }
      }
      update({ itemDescriptions: map, aiDescription: '' });
    } finally {
      setGeneratingAI(false);
    }
  }

  function handleNext() {
    if (step < ADD_STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (ADD_STEPS[nextStep].key === 'review' && !data.aiDescription) {
        generateAIDescription();
      }
    }
  }
  function handleBack() { if (step > 0) setStep(s => s - 1); }

  async function handleSaveItems() {
    if (data.selectedItems.length === 0) return;
    setSaving(true);
    try {
      const maxSort = await supabase.from('co_line_items').select('sort_order').eq('co_id', coId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const nextSort = (maxSort.data?.sort_order ?? 0) + 1;

      const rows = data.selectedItems.map((item, idx) => ({
        co_id: coId,
        org_id: orgId,
        item_name: item.item_name,
        unit: item.unit || 'EA',
        catalog_item_id: item.id,
        division: item.division,
        category_name: item.category_name,
        created_by_role: role,
        sort_order: nextSort + idx,
        // Per-item context — prefer per-item tag, fall back to wizard-level location.
        location_tag: item.locationTag || data.locationTag || null,
        reason: (item.reason ?? data.reason) || null,
        // Prefer the Review-step edited description, fall back to QA reasonDescription.
        description: data.itemDescriptions?.[item.id] || item.reasonDescription || null,
      }));

      const { error } = await supabase.from('co_line_items').insert(rows);
      if (error) throw error;

      const userId = (await supabase.auth.getUser()).data.user!.id;
      const itemNames = data.selectedItems.map(i => i.item_name).join(', ');
      await supabase.from('co_activity').insert({
        co_id: coId,
        project_id: projectId,
        actor_user_id: userId,
        actor_role: role,
        action: 'scope_added',
        detail: `Added: ${itemNames}`,
      });

      // Notify other orgs
      const orgIds = new Set<string>();
      if (co.org_id) orgIds.add(co.org_id);
      if (co.assigned_to_org_id) orgIds.add(co.assigned_to_org_id);
      for (const c of collaborators) { if (c.status === 'active') orgIds.add(c.organization_id); }
      orgIds.delete(orgId);
      const { title: nTitle, body: nBody } = buildCONotification('CO_SCOPE_ADDED', co.title);
      for (const tid of orgIds) {
        const { data: members } = await supabase.from('user_org_roles').select('user_id').eq('organization_id', tid);
        if (members) await Promise.allSettled(members.map(m => sendCONotification({
          recipient_user_id: m.user_id, recipient_org_id: tid, co_id: coId,
          project_id: projectId, type: 'CO_SCOPE_ADDED', title: nTitle, body: nBody,
        })));
      }

      toast.success(`${data.selectedItems.length} item(s) added`);
      resetAndClose();
      onAdded();
      queryClient.invalidateQueries({ queryKey: ['co-detail'] });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add items');
    } finally {
      setSaving(false);
    }
  }

  const savedLocation = useMemo(() => {
    try { return localStorage.getItem(`${user?.id}_${projectId}_last_location`); }
    catch { return null; }
  }, [user?.id, projectId]);

  const body = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header / progress */}
      <div className="px-5 py-3 border-b shrink-0 bg-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">Add scope items</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Step {step + 1} of {ADD_STEPS.length} · {currentStep.label}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {ADD_STEPS.map((_, i) => (
              <div key={i} className={cn('w-7 h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </div>
      </div>

      {/* Step nav (desktop) */}
      <div className="flex flex-1 min-h-0">
        {!isMobile && (
          <nav className="hidden xl:flex flex-col gap-1 w-48 border-r bg-muted/30 p-2 shrink-0">
            {ADD_STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
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

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="mb-3 xl:hidden">
              <h3 className="text-base font-semibold leading-tight">{currentStep.label}</h3>
              <p className="text-xs text-muted-foreground">{currentStep.description}</p>
            </div>

            {currentStep.key === 'why' && (
              <StepWhy data={data} onChange={update} isTM={isTM} />
            )}
            {currentStep.key === 'where' && (
              <StepWhere
                projectId={projectId}
                data={data}
                onChange={update}
                savedLocation={savedLocation}
                userId={user?.id}
              />
            )}
            {currentStep.key === 'scope' && (
              <StepCatalog data={data} onChange={update} projectId={projectId} intent={data.intent ?? null} />
            )}
            {currentStep.key === 'review' && (
              <StepReview
                data={data}
                onChange={update}
                role={role}
                isTM={isTM}
                projectId={projectId}
                generatingAI={generatingAI}
                onRegenerate={generateAIDescription}
                mode="add"
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-card px-4 sm:px-6 py-3 shrink-0">
            <Button variant="ghost" size="sm" disabled={saving} onClick={step === 0 ? resetAndClose : handleBack}>
              {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={handleSaveItems} disabled={saving || !canAdvance()}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add {data.selectedItems.length} item{data.selectedItems.length === 1 ? '' : 's'}
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

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => { setData(buildEmptyWizard(co)); setStep(0); setOpen(true); }}
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </Button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
          <SheetContent side="bottom" className="h-[94vh] p-0 rounded-t-2xl overflow-hidden">
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
          <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
            <DialogTitle className="sr-only">Add scope items</DialogTitle>
            <DialogDescription className="sr-only">Add items to this change order</DialogDescription>
            {body}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
