import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

export interface TimelineEvent {
  ts: string;
  type: 'PO_CREATED' | 'PO_ORDERED' | 'PO_DELIVERED' | 'INV_SUBMITTED' | 'INV_PAID' | 'RETURN' | 'CO';
  title: string;
  amount?: number;
  ref?: string;
}

export interface SupplierProjectAnalytics {
  // Sell-through
  remainingEstimate: number;
  walletCapturePct: number;
  poCountByWeek: number[]; // last 4 weeks, oldest first
  daysSinceLastPO: number | null;
  packsNotOrderedCount: number;

  // A/R Aging
  aging: AgingBuckets;
  avgDsoDays: number | null;
  oldestPastDueDays: number | null;
  firstDeliveryAt: string | null;
  lienDeadline: string | null;

  // Delivery perf (partial; OTIF requires requested_date which isn't tracked)
  avgLeadTimeDays: number | null;
  upcomingDeliveries: { id: string; po_number: string | null; po_name: string | null; date: string; amount: number }[];

  // Returns
  returnsTotal: number;
  returnRatePct: number;
  openCreditMemos: number;
  topReturnReasons: { reason: string; total: number }[];

  // Margin & pricing
  priceOverrideCount: number;
  priceOverrideTotal: number;

  // Future demand
  activeCOs: { count: number; total: number };

  // Timeline
  events: TimelineEvent[];
}

interface Args {
  projectId: string;
  supplierId: string | undefined;
  supplierOrgId: string | undefined;
  estimateTotal: number;
  orderedTotal: number;
  packCount: number;
  packsOrderedCount: number;
}

function bucketAge(daysPastDue: number, amount: number, b: AgingBuckets) {
  if (daysPastDue <= 0) b.current += amount;
  else if (daysPastDue <= 30) b.d1_30 += amount;
  else if (daysPastDue <= 60) b.d31_60 += amount;
  else if (daysPastDue <= 90) b.d61_90 += amount;
  else b.d90_plus += amount;
}

export function useSupplierProjectAnalytics({
  projectId, supplierId, supplierOrgId,
  estimateTotal, orderedTotal, packCount, packsOrderedCount,
}: Args) {
  return useQuery<SupplierProjectAnalytics>({
    queryKey: ['supplier-project-analytics', projectId, supplierId, supplierOrgId, estimateTotal, orderedTotal],
    enabled: !!projectId && !!supplierId,
    queryFn: async () => {
      const now = new Date();

      const [posRes, invRes, returnsRes, coRes, lineRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id, po_number, po_name, status, po_total, created_at, ordered_at, delivered_at, ready_for_delivery_at')
          .eq('project_id', projectId)
          .eq('supplier_id', supplierId!),
        // invoices joined via po_id
        supabase
          .from('purchase_orders')
          .select('id')
          .eq('project_id', projectId)
          .eq('supplier_id', supplierId!)
          .then(async (r) => {
            const ids = (r.data || []).map((x: any) => x.id);
            if (!ids.length) return { data: [] as any[] };
            return supabase
              .from('invoices')
              .select('id, invoice_number, total_amount, status, submitted_at, approved_at, paid_at, created_at, po_id')
              .in('po_id', ids);
          }),
        supplierOrgId
          ? supabase
              .from('returns')
              .select('id, status, credit_subtotal, reason, created_at')
              .eq('project_id', projectId)
              .eq('supplier_org_id', supplierOrgId)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('change_orders')
          .select('id, co_number, status, tc_submitted_price, created_at')
          .eq('project_id', projectId)
          .in('status', ['draft', 'shared', 'submitted', 'approved']),
        // Price overrides via po_line_items joined to our POs
        supabase
          .from('purchase_orders')
          .select('id')
          .eq('project_id', projectId)
          .eq('supplier_id', supplierId!)
          .then(async (r) => {
            const ids = (r.data || []).map((x: any) => x.id);
            if (!ids.length) return { data: [] as any[] };
            return supabase
              .from('po_line_items')
              .select('po_id, line_total, original_unit_price, unit_price, quantity, price_adjusted_by_supplier')
              .in('po_id', ids);
          }),
      ]);

      const pos = (posRes.data || []) as any[];
      const invoices = (invRes.data || []) as any[];
      const returns = (returnsRes.data || []) as any[];
      const cos = (coRes.data || []) as any[];
      const lines = (lineRes.data || []) as any[];

      // ── Sell-through ──
      const remainingEstimate = Math.max(0, estimateTotal - orderedTotal);
      const walletCapturePct = estimateTotal > 0 ? Math.round((orderedTotal / estimateTotal) * 100) : 0;

      const weekBuckets = [0, 0, 0, 0];
      pos.forEach(po => {
        const created = new Date(po.created_at);
        const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 7) weekBuckets[3]++;
        else if (days < 14) weekBuckets[2]++;
        else if (days < 21) weekBuckets[1]++;
        else if (days < 28) weekBuckets[0]++;
      });

      const lastPo = pos.reduce<Date | null>((latest, po) => {
        const d = new Date(po.created_at);
        return !latest || d > latest ? d : latest;
      }, null);
      const daysSinceLastPO = lastPo
        ? Math.floor((now.getTime() - lastPo.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const packsNotOrderedCount = Math.max(0, packCount - packsOrderedCount);

      // ── A/R Aging ──
      const aging: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
      let oldestPastDueDays: number | null = null;
      const dsoSamples: number[] = [];

      invoices.forEach(inv => {
        if (inv.status === 'PAID') {
          if (inv.submitted_at && inv.paid_at) {
            const days = Math.floor(
              (new Date(inv.paid_at).getTime() - new Date(inv.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days >= 0) dsoSamples.push(days);
          }
          return;
        }
        if (inv.status === 'DRAFT') return;
        // open invoice
        const refDate = inv.submitted_at || inv.created_at;
        if (!refDate) return;
        const daysPast = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
        bucketAge(daysPast, inv.total_amount || 0, aging);
        if (daysPast > 0 && (oldestPastDueDays === null || daysPast > oldestPastDueDays)) {
          oldestPastDueDays = daysPast;
        }
      });

      const avgDsoDays = dsoSamples.length
        ? Math.round(dsoSamples.reduce((s, d) => s + d, 0) / dsoSamples.length)
        : null;

      const firstDelivery = pos
        .filter(p => p.delivered_at)
        .reduce<Date | null>((earliest, po) => {
          const d = new Date(po.delivered_at);
          return !earliest || d < earliest ? d : earliest;
        }, null);
      const firstDeliveryAt = firstDelivery ? firstDelivery.toISOString() : null;
      const lienDeadline = firstDelivery
        ? new Date(firstDelivery.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // ── Delivery perf ──
      const leadTimes: number[] = [];
      pos.forEach(po => {
        if (po.created_at && po.delivered_at) {
          const days = Math.floor(
            (new Date(po.delivered_at).getTime() - new Date(po.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days >= 0) leadTimes.push(days);
        }
      });
      const avgLeadTimeDays = leadTimes.length
        ? Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length)
        : null;

      const upcomingDeliveries = pos
        .filter(p => p.status === 'ORDERED' || p.status === 'READY_FOR_DELIVERY')
        .map(p => ({
          id: p.id,
          po_number: p.po_number,
          po_name: p.po_name,
          date: p.ready_for_delivery_at || p.ordered_at || p.created_at,
          amount: p.po_total || 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      // ── Returns ──
      const returnsTotal = returns.reduce((s, r) => s + (r.credit_subtotal || 0), 0);
      const deliveredTotal = pos
        .filter(p => p.status === 'DELIVERED' || p.status === 'FINALIZED')
        .reduce((s, p) => s + (p.po_total || 0), 0);
      const returnRatePct = deliveredTotal > 0 ? +((returnsTotal / deliveredTotal) * 100).toFixed(1) : 0;
      const openCreditMemos = returns.filter(r => r.status === 'APPROVED' || r.status === 'CREDITED').length;

      const reasonMap: Record<string, number> = {};
      returns.forEach(r => {
        const reason = r.reason || 'Unspecified';
        reasonMap[reason] = (reasonMap[reason] || 0) + (r.credit_subtotal || 0);
      });
      const topReturnReasons = Object.entries(reasonMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, total]) => ({ reason, total }));

      // ── Margin & pricing overrides ──
      let priceOverrideCount = 0;
      let priceOverrideTotal = 0;
      lines.forEach(li => {
        if (li.price_adjusted_by_supplier && li.original_unit_price && li.unit_price) {
          priceOverrideCount++;
          const delta = (li.original_unit_price - li.unit_price) * (li.quantity || 0);
          priceOverrideTotal += delta;
        }
      });

      // ── Future demand ──
      const activeCOs = {
        count: cos.length,
        total: cos.reduce((s, c) => s + (c.tc_submitted_price || 0), 0),
      };

      // ── Timeline ──
      const events: TimelineEvent[] = [];
      pos.forEach(po => {
        events.push({ ts: po.created_at, type: 'PO_CREATED', title: `PO ${po.po_number || 'created'}`, amount: po.po_total, ref: po.id });
        if (po.ordered_at) events.push({ ts: po.ordered_at, type: 'PO_ORDERED', title: `${po.po_number || 'PO'} marked ordered`, amount: po.po_total, ref: po.id });
        if (po.delivered_at) events.push({ ts: po.delivered_at, type: 'PO_DELIVERED', title: `${po.po_number || 'PO'} delivered`, amount: po.po_total, ref: po.id });
      });
      invoices.forEach(inv => {
        if (inv.submitted_at) events.push({ ts: inv.submitted_at, type: 'INV_SUBMITTED', title: `Invoice ${inv.invoice_number} submitted`, amount: inv.total_amount, ref: inv.id });
        if (inv.paid_at) events.push({ ts: inv.paid_at, type: 'INV_PAID', title: `Invoice ${inv.invoice_number} paid`, amount: inv.total_amount, ref: inv.id });
      });
      returns.forEach(r => {
        events.push({ ts: r.created_at, type: 'RETURN', title: `Return / credit issued`, amount: r.credit_subtotal });
      });
      cos.forEach(c => {
        events.push({ ts: c.created_at, type: 'CO', title: `Change order ${c.co_number || ''} (${c.status})`, amount: c.tc_submitted_price });
      });
      events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return {
        remainingEstimate, walletCapturePct, poCountByWeek: weekBuckets,
        daysSinceLastPO, packsNotOrderedCount,
        aging, avgDsoDays, oldestPastDueDays, firstDeliveryAt, lienDeadline,
        avgLeadTimeDays, upcomingDeliveries,
        returnsTotal, returnRatePct, openCreditMemos, topReturnReasons,
        priceOverrideCount, priceOverrideTotal,
        activeCOs,
        events: events.slice(0, 50),
      };
    },
  });
}
