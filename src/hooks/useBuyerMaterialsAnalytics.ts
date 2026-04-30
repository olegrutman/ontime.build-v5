import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type POStageKey =
  | 'DRAFT' | 'SUBMITTED' | 'PRICED' | 'ORDERED'
  | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'FINALIZED';

export interface PipelineStage {
  key: POStageKey;
  label: string;
  count: number;
  total: number;
  oldestDays: number | null; // days the oldest PO has been stuck in this stage
}

export interface PriceVariance {
  totalAdjustedDelta: number;     // sum of (unit_price - original_unit_price) * qty for adjusted lines
  adjustedLineCount: number;
  totalLineCount: number;
  topOffenders: { description: string; sku: string | null; delta: number }[];
}

export interface DeliveryRisk {
  avgLeadTimeDays: number | null;
  onTimeRatePct: number | null;
  lateCount: number;
  lateTotal: number;
  lateList: { id: string; po_number: string | null; po_name: string | null; daysLate: number; amount: number }[];
}

export interface ReturnsImpact {
  returnedTotal: number;
  restockingTotal: number;
  netCredit: number;
  returnRatePct: number;          // returnedTotal / deliveredTotal
  topReasons: { reason: string; total: number }[];
}

export interface PayableAging {
  current: number;
  d1_30: number;
  d31_60: number;
  d60_plus: number;
}

export interface CashExposure {
  openCommitments: number;        // PO_total of ORDERED+ status with no invoice yet
  unpaidInvoicesTotal: number;
  aging: PayableAging;
  next14DaysOutflow: number;      // SUBMITTED/APPROVED invoices created in last 30d
}

export interface PackVariance {
  packName: string;
  estimate: number;
  ordered: number;
  delivered: number;
  variance: number;
  variancePct: number;
  status: 'ok' | 'watch' | 'over';
}

export interface BuyerMaterialsAnalytics {
  // Forecast
  estimateTotal: number;
  committedTotal: number;
  deliveredTotal: number;
  remainingHeadroom: number;
  forecastAtCompletion: number;
  variancePct: number;

  pipeline: PipelineStage[];
  priceVariance: PriceVariance;
  deliveryRisk: DeliveryRisk;
  returnsImpact: ReturnsImpact;
  cashExposure: CashExposure;
  packs: PackVariance[];
}

interface Args {
  projectId: string;
  buyerOrgId: string | undefined;
  estimateTotal: number;
  enabled: boolean;
}

const STAGE_LABELS: Record<POStageKey, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PRICED: 'Priced',
  ORDERED: 'Ordered',
  READY_FOR_DELIVERY: 'Ready',
  DELIVERED: 'Delivered',
  FINALIZED: 'Finalized',
};

const STAGE_TIMESTAMP_FIELD: Record<POStageKey, string> = {
  DRAFT: 'created_at',
  SUBMITTED: 'submitted_at',
  PRICED: 'priced_at',
  ORDERED: 'ordered_at',
  READY_FOR_DELIVERY: 'ready_for_delivery_at',
  DELIVERED: 'delivered_at',
  FINALIZED: 'updated_at',
};

function bucketPayableAge(days: number, amount: number, b: PayableAging) {
  if (days <= 0) b.current += amount;
  else if (days <= 30) b.d1_30 += amount;
  else if (days <= 60) b.d31_60 += amount;
  else b.d60_plus += amount;
}

export function useBuyerMaterialsAnalytics({
  projectId, buyerOrgId, estimateTotal, enabled,
}: Args) {
  return useQuery<BuyerMaterialsAnalytics>({
    queryKey: ['buyer-materials-analytics', projectId, buyerOrgId, estimateTotal],
    enabled: enabled && !!projectId && !!buyerOrgId,
    queryFn: async () => {
      const now = new Date();

      // POs created by buyer org for this project
      const posRes = await supabase
        .from('purchase_orders')
        .select(
          'id, po_number, po_name, status, po_total, source_pack_name, source_estimate_id, ' +
          'created_at, submitted_at, priced_at, ordered_at, ready_for_delivery_at, delivered_at, updated_at'
        )
        .eq('project_id', projectId)
        .eq('created_by_org_id', buyerOrgId!);

      const pos = (posRes.data || []) as any[];
      const poIds = pos.map(p => p.id);

      const [linesRes, invRes, returnsRes, packEstRes] = await Promise.all([
        poIds.length
          ? supabase
              .from('po_line_items')
              .select('po_id, description, supplier_sku, quantity, unit_price, original_unit_price, line_total, lead_time_days, price_adjusted_by_supplier')
              .in('po_id', poIds)
          : Promise.resolve({ data: [] as any[] }),
        poIds.length
          ? supabase
              .from('invoices')
              .select('id, po_id, total_amount, status, submitted_at, approved_at, paid_at, created_at')
              .in('po_id', poIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('returns')
          .select('id, status, credit_subtotal, restocking_total, net_credit_total, reason, created_at')
          .eq('project_id', projectId)
          .eq('created_by_org_id', buyerOrgId!),
        // Pack estimates — pulled from supplier_estimates approved on this project
        supabase
          .from('supplier_estimates')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'approved'),
      ]);

      const lines = (linesRes.data || []) as any[];
      const invoices = (invRes.data || []) as any[];
      const returns = (returnsRes.data || []) as any[];
      const approvedEstimates = (packEstRes.data || []) as any[];

      // ── Pipeline ──
      const stageOrder: POStageKey[] = ['DRAFT', 'SUBMITTED', 'PRICED', 'ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'];
      const pipeline: PipelineStage[] = stageOrder.map(key => {
        const inStage = pos.filter(p => p.status === key);
        const total = inStage.reduce((s, p) => s + (p.po_total || 0), 0);
        const tsField = STAGE_TIMESTAMP_FIELD[key];
        const ages = inStage
          .map(p => p[tsField])
          .filter(Boolean)
          .map(ts => Math.floor((now.getTime() - new Date(ts).getTime()) / 86400000));
        const oldestDays = ages.length ? Math.max(...ages) : null;
        return { key, label: STAGE_LABELS[key], count: inStage.length, total, oldestDays };
      });

      // ── Forecast / FAC ──
      const committedTotal = pos
        .filter(p => ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'].includes(p.status))
        .reduce((s, p) => s + (p.po_total || 0), 0);
      const deliveredTotal = pos
        .filter(p => ['DELIVERED', 'FINALIZED'].includes(p.status))
        .reduce((s, p) => s + (p.po_total || 0), 0);

      // overrun ratio so far = committed/expected_for_committed.
      // simpler: variance vs estimate scaled to remaining
      const overrunRatio = estimateTotal > 0 && committedTotal > 0
        ? Math.max(0, (committedTotal / estimateTotal) - (committedTotal > 0 ? committedTotal / Math.max(estimateTotal, committedTotal) : 0))
        : 0;
      const unCommittedEstimate = Math.max(0, estimateTotal - committedTotal);
      const forecastAtCompletion = committedTotal + unCommittedEstimate * (1 + overrunRatio);
      const remainingHeadroom = estimateTotal - forecastAtCompletion;
      const variancePct = estimateTotal > 0 ? ((forecastAtCompletion - estimateTotal) / estimateTotal) * 100 : 0;

      // ── Price variance ──
      let totalAdjustedDelta = 0;
      let adjustedLineCount = 0;
      const offenderMap = new Map<string, { description: string; sku: string | null; delta: number }>();
      lines.forEach(li => {
        if (li.price_adjusted_by_supplier && li.original_unit_price && li.unit_price) {
          adjustedLineCount++;
          const delta = (Number(li.unit_price) - Number(li.original_unit_price)) * Number(li.quantity || 0);
          totalAdjustedDelta += delta;
          const key = `${li.supplier_sku || ''}::${li.description}`;
          const ex = offenderMap.get(key);
          if (ex) ex.delta += delta;
          else offenderMap.set(key, { description: li.description, sku: li.supplier_sku, delta });
        }
      });
      const topOffenders = Array.from(offenderMap.values())
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 5);

      const priceVariance: PriceVariance = {
        totalAdjustedDelta,
        adjustedLineCount,
        totalLineCount: lines.length,
        topOffenders,
      };

      // ── Delivery risk ──
      const linesByPo = new Map<string, any[]>();
      lines.forEach(li => {
        const arr = linesByPo.get(li.po_id) || [];
        arr.push(li);
        linesByPo.set(li.po_id, arr);
      });

      const leadTimes: number[] = [];
      let onTimeCount = 0;
      let evaluatedForOnTime = 0;
      const lateList: DeliveryRisk['lateList'] = [];

      pos.forEach(po => {
        const ordered = po.ordered_at ? new Date(po.ordered_at) : null;
        const delivered = po.delivered_at ? new Date(po.delivered_at) : null;
        const poLines = linesByPo.get(po.id) || [];
        const quotedLeads = poLines.map(l => l.lead_time_days).filter((d: any) => d != null);
        const maxQuoted = quotedLeads.length ? Math.max(...quotedLeads) : null;
        if (maxQuoted != null) leadTimes.push(maxQuoted);

        if (ordered && delivered && maxQuoted != null) {
          const actualDays = Math.floor((delivered.getTime() - ordered.getTime()) / 86400000);
          evaluatedForOnTime++;
          if (actualDays <= maxQuoted) onTimeCount++;
        } else if (ordered && !delivered && maxQuoted != null) {
          const expectedBy = new Date(ordered.getTime() + maxQuoted * 86400000);
          if (now > expectedBy) {
            const daysLate = Math.floor((now.getTime() - expectedBy.getTime()) / 86400000);
            lateList.push({
              id: po.id,
              po_number: po.po_number,
              po_name: po.po_name,
              daysLate,
              amount: po.po_total || 0,
            });
          }
        }
      });
      lateList.sort((a, b) => b.daysLate - a.daysLate);

      const deliveryRisk: DeliveryRisk = {
        avgLeadTimeDays: leadTimes.length
          ? Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length)
          : null,
        onTimeRatePct: evaluatedForOnTime > 0
          ? Math.round((onTimeCount / evaluatedForOnTime) * 100)
          : null,
        lateCount: lateList.length,
        lateTotal: lateList.reduce((s, l) => s + l.amount, 0),
        lateList: lateList.slice(0, 5),
      };

      // ── Returns impact ──
      const returnedTotal = returns.reduce((s, r) => s + Number(r.credit_subtotal || 0), 0);
      const restockingTotal = returns.reduce((s, r) => s + Number(r.restocking_total || 0), 0);
      const netCredit = returns.reduce((s, r) => s + Number(r.net_credit_total ?? (Number(r.credit_subtotal || 0) - Number(r.restocking_total || 0))), 0);
      const returnRatePct = deliveredTotal > 0 ? +((returnedTotal / deliveredTotal) * 100).toFixed(1) : 0;
      const reasonMap: Record<string, number> = {};
      returns.forEach(r => {
        const reason = r.reason || 'Unspecified';
        reasonMap[reason] = (reasonMap[reason] || 0) + Number(r.credit_subtotal || 0);
      });
      const topReasons = Object.entries(reasonMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, total]) => ({ reason, total }));

      const returnsImpact: ReturnsImpact = {
        returnedTotal, restockingTotal, netCredit, returnRatePct, topReasons,
      };

      // ── Cash exposure ──
      const invoicedPoIds = new Set(invoices.map(i => i.po_id).filter(Boolean));
      const openCommitments = pos
        .filter(p => ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED'].includes(p.status))
        .filter(p => !invoicedPoIds.has(p.id))
        .reduce((s, p) => s + (p.po_total || 0), 0);

      const aging: PayableAging = { current: 0, d1_30: 0, d31_60: 0, d60_plus: 0 };
      let unpaidInvoicesTotal = 0;
      let next14DaysOutflow = 0;
      invoices.forEach(inv => {
        if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'REJECTED') return;
        const amt = Number(inv.total_amount || 0);
        unpaidInvoicesTotal += amt;
        const refDate = inv.submitted_at || inv.created_at;
        if (refDate) {
          const daysOld = Math.floor((now.getTime() - new Date(refDate).getTime()) / 86400000);
          bucketPayableAge(daysOld, amt, aging);
          if (daysOld <= 14) next14DaysOutflow += amt;
        }
      });

      const cashExposure: CashExposure = {
        openCommitments,
        unpaidInvoicesTotal,
        aging,
        next14DaysOutflow,
      };

      // ── Pack-level variance ──
      const estimateIds = approvedEstimates.map(e => e.id);
      const packMap = new Map<string, PackVariance>();

      if (estimateIds.length) {
        const [{ data: packRows }, { data: itemRows }] = await Promise.all([
          supabase
            .from('estimate_packs')
            .select('id, pack_name, estimate_id')
            .in('estimate_id', estimateIds),
          supabase
            .from('supplier_estimate_items')
            .select('estimate_id, pack_name, line_total')
            .in('estimate_id', estimateIds),
        ]);

        // Sum estimate per pack name
        (itemRows || []).forEach((it: any) => {
          const name = it.pack_name || 'Unassigned';
          const cur = packMap.get(name) || { packName: name, estimate: 0, ordered: 0, delivered: 0, variance: 0, variancePct: 0, status: 'ok' as const };
          cur.estimate += Number(it.line_total || 0);
          packMap.set(name, cur);
        });
        // Make sure each pack row exists too
        (packRows || []).forEach((p: any) => {
          const name = p.pack_name;
          if (!packMap.has(name)) {
            packMap.set(name, { packName: name, estimate: 0, ordered: 0, delivered: 0, variance: 0, variancePct: 0, status: 'ok' });
          }
        });
      }

      // Sum POs per pack
      pos.forEach(p => {
        const name = p.source_pack_name || 'Ad-hoc';
        const cur = packMap.get(name) || { packName: name, estimate: 0, ordered: 0, delivered: 0, variance: 0, variancePct: 0, status: 'ok' as const };
        if (['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'].includes(p.status)) {
          cur.ordered += Number(p.po_total || 0);
        }
        if (['DELIVERED', 'FINALIZED'].includes(p.status)) {
          cur.delivered += Number(p.po_total || 0);
        }
        packMap.set(name, cur);
      });

      const packs = Array.from(packMap.values()).map(p => {
        const variance = p.ordered - p.estimate;
        const variancePct = p.estimate > 0 ? (variance / p.estimate) * 100 : 0;
        const status: PackVariance['status'] =
          variancePct > 5 ? 'over' : variancePct > 0 ? 'watch' : 'ok';
        return { ...p, variance, variancePct, status };
      }).sort((a, b) => b.estimate + b.ordered - (a.estimate + a.ordered));

      return {
        estimateTotal,
        committedTotal,
        deliveredTotal,
        remainingHeadroom,
        forecastAtCompletion,
        variancePct,
        pipeline,
        priceVariance,
        deliveryRisk,
        returnsImpact,
        cashExposure,
        packs,
      };
    },
  });
}
