import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ArrowRight, FileText, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CO_REASON_LABELS } from '@/types/changeOrder';
import type { COReasonCode, COLaborEntry, COMaterialItem, COEquipmentItem, COLineItem } from '@/types/changeOrder';

interface CreateInvoiceFromCOsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface ApprovedCO {
  id: string;
  title: string | null;
  co_number: string | null;
  location_tag: string | null;
  reason: string | null;
  pricing_type: string;
}

interface GeneratedLineItem {
  description: string;
  amount: number;
  coId: string;
  type: 'labor' | 'material' | 'equipment';
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CreateInvoiceFromCOs({ open, onOpenChange, projectId, onSuccess }: CreateInvoiceFromCOsProps) {
  const { user, userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization_id;

  const [step, setStep] = useState<'select' | 'review'>('select');
  const [approvedCOs, setApprovedCOs] = useState<ApprovedCO[]>([]);
  const [existingCoIds, setExistingCoIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lineItems, setLineItems] = useState<GeneratedLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retainagePercent, setRetainagePercent] = useState(0);

  // Determine invoicing role from org type
  const orgType = userOrgRoles[0]?.organization?.type as string | undefined;
  const invoicingRole: 'TC' | 'FC' | null = orgType === 'TC' ? 'TC' : orgType === 'FC' ? 'FC' : null;

  // Fetch approved COs and existing billed CO IDs
  useEffect(() => {
    if (!open || !projectId || !currentOrgId) return;
    setStep('select');
    setSelectedIds(new Set());
    setLineItems([]);

    (async () => {
      setLoading(true);
      try {
        // Get approved COs on this project filtered by org involvement
        const { data: cos, error: cosErr } = await supabase
          .from('change_orders')
          .select('id, title, co_number, location_tag, reason, pricing_type, org_id, assigned_to_org_id, completion_acknowledged_at')
          .eq('project_id', projectId)
          .in('status', ['approved', 'contracted'])
          .order('created_at', { ascending: false });
        if (cosErr) throw cosErr;

        // Filter: TC sees COs assigned to them; FC sees COs where they own it
        const filtered = (cos ?? []).filter(co => {
          if (invoicingRole === 'TC') {
            // TC invoices GC: only COs assigned to TC's org with completion acknowledged
            return co.assigned_to_org_id === currentOrgId && co.completion_acknowledged_at;
          }
          if (invoicingRole === 'FC') {
            // FC invoices TC: only COs created by FC's org
            return co.org_id === currentOrgId;
          }
          return false; // GC doesn't create invoices from COs
        });

        // Get already-billed CO IDs from existing invoices
        const { data: invoices, error: invErr } = await supabase
          .from('invoices')
          .select('co_ids')
          .eq('project_id', projectId)
          .not('co_ids', 'is', null);
        if (invErr) throw invErr;

        const billed = new Set<string>();
        for (const inv of invoices ?? []) {
          const ids = (inv as any).co_ids as string[] | null;
          if (ids) ids.forEach(id => billed.add(id));
        }

        setExistingCoIds(billed);
        setApprovedCOs(filtered as ApprovedCO[]);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load change orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, projectId]);

  const availableCOs = useMemo(
    () => approvedCOs.filter(co => !existingCoIds.has(co.id)),
    [approvedCOs, existingCoIds],
  );

  function toggleCO(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generateLineItems() {
    setLoading(true);
    try {
      const ids = Array.from(selectedIds);

      // Fetch labor, materials, equipment for selected COs — filtered by invoicing role
      let laborQuery = supabase.from('co_labor_entries').select('*').in('co_id', ids).eq('is_actual_cost', false).order('entry_date');
      if (invoicingRole) {
        laborQuery = laborQuery.eq('entered_by_role', invoicingRole);
      }

      let materialsQuery = supabase.from('co_material_items').select('*').in('co_id', ids).order('line_number');
      if (invoicingRole) {
        materialsQuery = materialsQuery.eq('added_by_role', invoicingRole);
      }

      let equipmentQuery = supabase.from('co_equipment_items').select('*').in('co_id', ids).order('created_at');
      if (invoicingRole) {
        equipmentQuery = equipmentQuery.eq('added_by_role', invoicingRole);
      }

      const [laborRes, lineItemsRes, materialsRes, equipmentRes] = await Promise.all([
        laborQuery,
        supabase.from('co_line_items').select('*').in('co_id', ids).order('sort_order'),
        materialsQuery,
        equipmentQuery,
      ]);

      if (laborRes.error) throw laborRes.error;
      if (lineItemsRes.error) throw lineItemsRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (equipmentRes.error) throw equipmentRes.error;

      const labor = (laborRes.data ?? []) as COLaborEntry[];
      const scopeItems = (lineItemsRes.data ?? []) as COLineItem[];
      const materials = (materialsRes.data ?? []) as COMaterialItem[];
      const equipment = (equipmentRes.data ?? []) as COEquipmentItem[];

      const scopeMap = new Map(scopeItems.map(s => [s.id, s]));
      const generated: GeneratedLineItem[] = [];

      // Labor entries → line items
      for (const entry of labor) {
        const scope = scopeMap.get(entry.co_line_item_id);
        const itemName = scope?.item_name ?? 'Labor';
        let desc: string;
        if (entry.pricing_mode === 'lump_sum' && entry.lump_sum) {
          desc = `${itemName} – Lump sum`;
        } else if (entry.hours && entry.hourly_rate) {
          desc = `${itemName} – ${entry.hours} hrs × $${entry.hourly_rate.toFixed(2)}/hr`;
        } else {
          desc = `${itemName} – Labor`;
        }
        if (entry.description) desc += ` (${entry.description})`;

        generated.push({
          description: desc,
          amount: entry.line_total ?? 0,
          coId: entry.co_id,
          type: 'labor',
        });
      }

      // Materials → line items
      for (const mat of materials) {
        let desc = mat.description;
        if (mat.quantity && mat.unit_cost) {
          desc += ` – ${mat.quantity} ${mat.uom} × $${mat.unit_cost.toFixed(2)}`;
          if (mat.markup_percent > 0) desc += ` + ${mat.markup_percent}% markup`;
        }

        generated.push({
          description: desc,
          amount: mat.billed_amount ?? 0,
          coId: mat.co_id,
          type: 'material',
        });
      }

      // Equipment → line items
      for (const eq of equipment) {
        let desc = eq.description;
        if (eq.duration_note) desc += ` – ${eq.duration_note}`;
        if (eq.markup_percent > 0) desc += ` + ${eq.markup_percent}% markup`;

        generated.push({
          description: desc,
          amount: eq.billed_amount ?? 0,
          coId: eq.co_id,
          type: 'equipment',
        });
      }

      setLineItems(generated);
      setStep('review');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate line items');
    } finally {
      setLoading(false);
    }
  }

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const retainageAmount = subtotal * (retainagePercent / 100);
  const total = subtotal - retainageAmount;

  async function handleSubmit() {
    if (!user || !currentOrgId) return;
    setSubmitting(true);
    try {
      const coIds = Array.from(selectedIds);
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);

      // Find contract where current org is from_org (invoicer)
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('id')
        .eq('project_id', projectId)
        .eq('from_org_id', currentOrgId)
        .limit(1);

      const contractId = contracts?.[0]?.id ?? null;

      // Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          contract_id: contractId,
          co_ids: coIds,
          invoice_number: `CO-INV-${Date.now().toString(36).toUpperCase()}`,
          billing_period_start: today,
          billing_period_end: today,
          status: 'DRAFT',
          subtotal,
          retainage_amount: retainageAmount,
          total_amount: total,
          created_by: user.id,
          notes: `Invoice from ${coIds.length} change order${coIds.length > 1 ? 's' : ''}`,
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Create line items
      const invoiceLineItems = lineItems.map((li, i) => ({
        invoice_id: invoice.id,
        description: li.description,
        scheduled_value: li.amount,
        previous_billed: 0,
        current_billed: li.amount,
        total_billed: li.amount,
        retainage_percent: retainagePercent,
        retainage_amount: li.amount * (retainagePercent / 100),
        sort_order: i + 1,
      }));

      const { error: liErr } = await supabase
        .from('invoice_line_items')
        .insert(invoiceLineItems);

      if (liErr) throw liErr;

      toast.success('Invoice created from change orders');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {step === 'select' ? 'Select Change Orders' : 'Review Invoice Line Items'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select approved change orders to include in this invoice.
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableCOs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No unbilled approved change orders available.
              </div>
            ) : (
              <div className="space-y-2">
                {availableCOs.map(co => {
                  const selected = selectedIds.has(co.id);
                  return (
                    <div
                      key={co.id}
                      className={cn(
                        'rounded-lg border p-3 cursor-pointer transition-colors',
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                      )}
                      onClick={() => toggleCO(co.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={selected} className="mt-0.5" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {co.title ?? co.co_number ?? 'Untitled CO'}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            {co.reason && (
                              <span>{CO_REASON_LABELS[co.reason as COReasonCode]}</span>
                            )}
                            {co.location_tag && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {co.location_tag.split(' | ')[0]}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {co.pricing_type === 'fixed' ? 'Fixed' : co.pricing_type === 'tm' ? 'T&M' : 'NTE'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={generateLineItems}
                disabled={selectedIds.size === 0 || loading}
                className="gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Review ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="gap-1 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to selection
            </Button>

            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No billable items found in selected change orders.
              </p>
            ) : (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2 text-[0.68rem] uppercase tracking-wide text-muted-foreground font-medium">Description</th>
                        <th className="text-left px-3 py-2 text-[0.68rem] uppercase tracking-wide text-muted-foreground font-medium w-16">Type</th>
                        <th className="text-right px-3 py-2 text-[0.68rem] uppercase tracking-wide text-muted-foreground font-medium w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 text-foreground">{li.description}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{li.type}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtCurrency(li.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="retainage" className="text-sm whitespace-nowrap">Retainage %</Label>
                    <Input
                      id="retainage"
                      type="number"
                      min={0}
                      max={100}
                      value={retainagePercent}
                      onChange={e => setRetainagePercent(Number(e.target.value) || 0)}
                      className="w-24"
                    />
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{fmtCurrency(subtotal)}</span>
                    </div>
                    {retainagePercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Retainage ({retainagePercent}%)</span>
                        <span className="font-medium tabular-nums text-destructive">-{fmtCurrency(retainageAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t pt-1.5">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold tabular-nums">{fmtCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || lineItems.length === 0}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Create Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
