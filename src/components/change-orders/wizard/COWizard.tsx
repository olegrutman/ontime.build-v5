import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useScopeCatalog } from '@/hooks/useScopeCatalog';
import { VisualLocationPicker } from '../VisualLocationPicker';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COCreatedByRole, COReasonCode, COPricingType, ScopeCatalogItem } from '@/types/changeOrder';

// ── Types ──────────────────────────────────────────────
export interface SelectedScopeItem extends ScopeCatalogItem {
  locationTag: string;
  reason: COReasonCode;
  reasonDescription: string;
}

export interface COWizardData {
  reason: COReasonCode | null;
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
}

const INITIAL_DATA: COWizardData = {
  reason: null,
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
};

const REASON_CARDS: { reason: COReasonCode; label: string; description: string; icon: string }[] = [
  { reason: 'addition', label: 'Extra scope', description: 'Work not in original plan', icon: '➕' },
  { reason: 'design_change', label: 'Plan changed', description: 'Drawings revised', icon: '📐' },
  { reason: 'damaged_by_others', label: 'Found damage', description: 'Another trade caused it', icon: '⚠️' },
  { reason: 'rework', label: 'Redo work', description: 'Something built wrong', icon: '🔄' },
  { reason: 'owner_request', label: 'Owner request', description: 'Owner asked for change', icon: '👤' },
  { reason: 'gc_request', label: 'GC request', description: 'GC directed the change', icon: '🏗️' },
  { reason: 'other', label: 'Other', description: 'Something else', icon: '📝' },
];

const PRICING_OPTIONS: { type: COPricingType; title: string; description: string }[] = [
  { type: 'fixed', title: 'Fixed price', description: 'Lump sum or itemized price, approved before work.' },
  { type: 'tm', title: 'Time & material', description: 'Hours and costs logged as work happens.' },
  { type: 'nte', title: 'Not to exceed', description: 'T&M with a cap. Must notify before exceeding.' },
];

const STEPS = [
  { key: 'why', label: 'Why', description: 'What triggered this change?' },
  { key: 'where', label: 'Where', description: 'Location of the work' },
  { key: 'how', label: 'How', description: 'Configuration & scope' },
  { key: 'team', label: 'Team', description: 'Confirm & create' },
] as const;

interface COWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  preSelectedReason?: COReasonCode;
}

export function COWizard({ open, onOpenChange, projectId, preSelectedReason }: COWizardProps) {
  const { currentRole, user, userOrgRoles } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<COWizardData>({
    ...INITIAL_DATA,
    reason: preSelectedReason ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { shareCO } = useChangeOrders(projectId);

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const role: COCreatedByRole =
    currentRole === 'GC_PM' ? 'GC' : currentRole === 'TC_PM' ? 'TC' : 'FC';
  const orgName = (userOrgRoles?.[0] as any)?.organization?.name ?? role;

  function update(patch: Partial<COWizardData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  // Saved location shortcut
  const savedLocation = (() => {
    try { return localStorage.getItem(`${user?.id}_${projectId}_last_location`); }
    catch { return null; }
  })();

  function canAdvance(): boolean {
    const s = STEPS[step];
    if (s.key === 'why') return !!data.reason;
    if (s.key === 'where') return !!data.locationTag;
    if (s.key === 'how') {
      if (role === 'GC' && !data.assignedToOrgId) return false;
      if (data.pricingType === 'nte' && (!data.nteCap || parseFloat(data.nteCap) <= 0)) return false;
      return true;
    }
    return true; // team step
  }

  function handleNext() { if (step < STEPS.length - 1) setStep(s => s + 1); }
  function handleBack() { if (step > 0) setStep(s => s - 1); }

  async function handleSubmit() {
    if (!orgId || !user) { toast.error('Not authenticated'); return; }
    setSubmitting(true);
    try {
      const { count } = await supabase
        .from('change_orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      const seq = (count ?? 0) + 1;
      const coNumber = `CO-${String(seq).padStart(3, '0')}`;
      const title = `${coNumber} · ${format(new Date(), 'MMM d, yyyy')}`;
      const preGeneratedId = crypto.randomUUID();

      // Auto-resolve assigned org for TC/FC
      let resolvedAssignedToOrgId = data.assignedToOrgId || null;
      if (!resolvedAssignedToOrgId && (role === 'TC' || role === 'FC')) {
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
          co_number: coNumber,
          status: 'draft',
          pricing_type: data.pricingType,
          nte_cap: data.pricingType === 'nte' && data.nteCap ? parseFloat(data.nteCap) : null,
          gc_budget: data.gcBudget ? parseFloat(data.gcBudget) : null,
          reason: data.reason,
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

      // Insert scope items
      if (data.selectedItems.length > 0) {
        const rows = data.selectedItems.map((item, idx) => ({
          co_id: preGeneratedId,
          org_id: orgId,
          created_by_role: role,
          catalog_item_id: item.id,
          item_name: item.item_name,
          division: item.division,
          category_name: item.category_name,
          unit: item.unit,
          sort_order: idx,
          location_tag: data.locationTag || null,
          reason: (data.reason || null) as string | null,
          description: item.reasonDescription || null,
        }));
        const { error: lineError } = await supabase.from('co_line_items').insert(rows);
        if (lineError) {
          await supabase.from('change_orders').delete().eq('id', preGeneratedId);
          throw new Error(`Failed to save scope items: ${lineError.message}`);
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

      // If GC assigned a TC, create invited collaborator
      if (role === 'GC' && resolvedAssignedToOrgId) {
        await supabase.from('change_order_collaborators').insert({
          co_id: preGeneratedId,
          organization_id: resolvedAssignedToOrgId,
          collaborator_type: 'FC', // using FC type since that's the only enum
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
      toast.success('Change order created');
      handleClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create change order');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setData({ ...INITIAL_DATA, reason: preSelectedReason ?? null });
    onOpenChange(false);
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const body = (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
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
        {/* Desktop nav */}
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

        {/* Step content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!isMobile && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{currentStep.label}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            )}

            {currentStep.key === 'why' && <StepWhy data={data} onChange={update} />}
            {currentStep.key === 'where' && (
              <StepWhere
                projectId={projectId}
                data={data}
                onChange={update}
                savedLocation={savedLocation}
                userId={user?.id}
              />
            )}
            {currentStep.key === 'how' && <StepHow data={data} onChange={update} role={role} projectId={projectId} />}
            {currentStep.key === 'team' && <StepTeam data={data} projectId={projectId} role={role} />}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-card px-4 sm:px-6 py-3">
            <Button variant="ghost" size="sm" disabled={submitting} onClick={step === 0 ? handleClose : handleBack}>
              {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !canAdvance()}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Change Order
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
        <DialogTitle className="sr-only">New Change Order</DialogTitle>
        <DialogDescription className="sr-only">Create a new change order</DialogDescription>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-card">
          <div>
            <h2 className="text-lg font-semibold">New Change Order</h2>
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

// ── Step 1: Why ──────────────────────────────────────
function StepWhy({ data, onChange }: { data: COWizardData; onChange: (p: Partial<COWizardData>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">What triggered this change order?</p>
      <div className="grid grid-cols-2 gap-3">
        {REASON_CARDS.map(card => (
          <button
            key={card.reason}
            type="button"
            onClick={() => onChange({ reason: card.reason })}
            className={cn(
              'flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left min-h-[80px]',
              data.reason === card.reason ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <span className="text-lg">{card.icon}</span>
            <span className="text-sm font-semibold text-foreground">{card.label}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{card.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Where ────────────────────────────────────
function StepWhere({
  projectId, data, onChange, savedLocation, userId,
}: {
  projectId: string;
  data: COWizardData;
  onChange: (p: Partial<COWizardData>) => void;
  savedLocation: string | null;
  userId?: string;
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

// ── Step 3: How ──────────────────────────────────────
function StepHow({
  data, onChange, role, projectId,
}: {
  data: COWizardData;
  onChange: (p: Partial<COWizardData>) => void;
  role: COCreatedByRole;
  projectId: string;
}) {
  // Team members for dropdowns
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

  // Scope items for FC/TC
  const { divisions, search } = useScopeCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => search(searchQuery), [searchQuery, search]);

  const selectedIds = useMemo(() => new Set(data.selectedItems.map(i => i.id)), [data.selectedItems]);

  function toggleItem(item: WorkOrderCatalogItem) {
    if (selectedIds.has(item.id)) {
      onChange({ selectedItems: data.selectedItems.filter(i => i.id !== item.id) });
    } else {
      onChange({
        selectedItems: [
          ...data.selectedItems,
          { ...item, locationTag: data.locationTag, reason: data.reason!, reasonDescription: '' },
        ],
      });
    }
  }

  // GC config
  if (role === 'GC') {
    return (
      <div className="space-y-6">
        {/* Assign TC */}
        <div className="space-y-2">
          <Label>Assign to *</Label>
          <Select value={data.assignedToOrgId} onValueChange={v => onChange({ assignedToOrgId: v })}>
            <SelectTrigger><SelectValue placeholder="Select a trade contractor" /></SelectTrigger>
            <SelectContent>
              {tcMembers.map(m => <SelectItem key={m.org_id} value={m.org_id}>{m.org_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Pricing type */}
        <PricingTypeSelector data={data} onChange={onChange} />

        {/* GC Budget */}
        <div className="space-y-1.5">
          <Label>Your budget (internal)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input type="number" value={data.gcBudget} onChange={e => onChange({ gcBudget: e.target.value })} className="pl-7" placeholder="0.00" />
          </div>
          <p className="text-xs text-muted-foreground">Private — not visible to TC or FC</p>
        </div>

        {/* Responsibility toggles */}
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
        <PricingTypeSelector data={data} onChange={onChange} />

        {/* FC input */}
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

        {/* Scope picker */}
        <ScopePicker
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          selectedIds={selectedIds}
          onToggle={toggleItem}
          selectedItems={data.selectedItems}
        />

        <ShareToggle value={data.shareDraftNow} onChange={v => onChange({ shareDraftNow: v })} />
      </div>
    );
  }

  // FC config
  return (
    <div className="space-y-6">
      {/* Quick hour pills */}
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

      {/* Scope picker */}
      <ScopePicker
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        selectedIds={selectedIds}
        onToggle={toggleItem}
        selectedItems={data.selectedItems}
      />

      <ShareToggle value={data.shareDraftNow} onChange={v => onChange({ shareDraftNow: v })} label="Share with TC immediately" />
    </div>
  );
}

// ── Step 4: Team ─────────────────────────────────────
function StepTeam({ data, projectId, role }: { data: COWizardData; projectId: string; role: COCreatedByRole }) {
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

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Confirm participants and create this change order.</p>

      <div className="space-y-2">
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
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground w-20 shrink-0">Reason</span>
            <span className="font-medium text-foreground">{CO_REASON_LABELS[data.reason]}</span>
          </div>
        )}
        {data.locationTag && (
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground w-20 shrink-0">Location</span>
            <span className="font-medium text-foreground">{data.locationTag}</span>
          </div>
        )}
        <div className="flex gap-2 text-sm">
          <span className="text-muted-foreground w-20 shrink-0">Pricing</span>
          <span className="font-medium text-foreground">
            {data.pricingType === 'fixed' ? 'Fixed Price' : data.pricingType === 'tm' ? 'Time & Material' : 'Not-to-Exceed'}
            {data.pricingType === 'nte' && data.nteCap && ` · $${parseFloat(data.nteCap).toLocaleString()}`}
          </span>
        </div>
        {data.selectedItems.length > 0 && (
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground w-20 shrink-0">Scope</span>
            <span className="font-medium text-foreground">{data.selectedItems.length} items</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────
function PricingTypeSelector({ data, onChange }: { data: COWizardData; onChange: (p: Partial<COWizardData>) => void }) {
  return (
    <div className="space-y-3">
      <Label>Pricing type</Label>
      <div className="space-y-2">
        {PRICING_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => onChange({ pricingType: opt.type })}
            className={cn(
              'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
              data.pricingType === opt.type ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
            )}
          >
            <span className={cn(
              'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
              data.pricingType === opt.type ? 'border-primary' : 'border-muted-foreground/40',
            )}>
              {data.pricingType === opt.type && <span className="w-2 h-2 rounded-full bg-primary" />}
            </span>
            <div>
              <p className="text-sm font-medium">{opt.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
      {data.pricingType === 'nte' && (
        <div className="space-y-1.5 pl-7">
          <Label>Maximum amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input type="number" value={data.nteCap} onChange={e => onChange({ nteCap: e.target.value })} className="pl-7" placeholder="0.00" />
          </div>
        </div>
      )}
    </div>
  );
}

function ScopePicker({
  searchQuery, setSearchQuery, searchResults, selectedIds, onToggle, selectedItems,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: WorkOrderCatalogItem[];
  selectedIds: Set<string>;
  onToggle: (item: WorkOrderCatalogItem) => void;
  selectedItems: SelectedScopeItem[];
}) {
  const items = searchQuery.trim() ? searchResults : searchResults.slice(0, 12);

  return (
    <div className="space-y-3">
      <Label>Scope items</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search scope items…" className="pl-9" />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item)}
            className={cn(
              'flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left',
              selectedIds.has(item.id) ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <span className="text-sm font-medium text-foreground line-clamp-2">{item.item_name}</span>
            <span className="text-[10px] text-muted-foreground">{item.category_name}</span>
            {selectedIds.has(item.id) && <Check className="h-3.5 w-3.5 text-primary mt-0.5" />}
          </button>
        ))}
      </div>
      {selectedItems.length > 0 && (
        <p className="text-xs text-primary font-medium">{selectedItems.length} items selected</p>
      )}
    </div>
  );
}

function ToggleWithSelector({
  label, hint, checked, onToggle, party, onPartyChange,
}: {
  label: string; hint: string; checked: boolean; onToggle: (v: boolean) => void;
  party: 'GC' | 'TC' | null; onPartyChange: (v: 'GC' | 'TC') => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onToggle} />
      </div>
      {checked && (
        <div className="flex gap-2 pl-4">
          {(['TC', 'GC'] as const).map(p => (
            <button
              key={p}
              onClick={() => onPartyChange(p)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                party === p ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30',
              )}
            >
              {p} responsible
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border">
      <div>
        <p className="text-sm font-medium">{label ?? 'Share immediately'}</p>
        <p className="text-xs text-muted-foreground">If off, they cannot see this until you share it</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
