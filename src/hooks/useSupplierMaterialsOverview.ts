import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackComparison {
  packName: string;
  estimateTotal: number;
  orderedTotal: number;
  overBudget: number;
  overBudgetPct: number;
}

export interface UnmatchedItem {
  description: string;
  orderedCost: number;
  deliveredCost: number;
  poCount: number;
  firstSeen: string;
}

export interface RiskFactors {
  unpricedItems: number;
  unpricedPOs: number;
  packsNotStarted: number;
  totalPacks: number;
  biggestUpcomingPack: { name: string; amount: number } | null;
}

export interface SupplierMaterialsOverviewData {
  loading: boolean;
  estimateTotal: number;
  salesTaxPercent: number;
  materialsOrdered: number;
  deliveredTotal: number;
  creditsTotal: number;
  deliveredNet: number;
  orderedVariance: number;
  orderedVariancePct: number;
  forecastFinal: number;
  forecastVariance: number;
  forecastVariancePct: number;
  forecastConfidence: 'low' | 'medium' | 'high';
  forecastOrderedPacks: number;
  packsOverBudget: PackComparison[];
  unmatchedItems: UnmatchedItem[];
  riskFactors: RiskFactors;
  chartData: { month: string; budget: number; ordered: number; delivered: number }[];
  lastUpdated: string | null;
}

export function useSupplierMaterialsOverview(projectId: string, supplierOrgId: string): SupplierMaterialsOverviewData {
  const { data: supplier } = useQuery({
    queryKey: ['supplier-by-org', supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id').eq('organization_id', supplierOrgId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!supplierOrgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-materials-overview', projectId, supplierOrgId, supplier?.id],
    queryFn: async () => {
      const supplierId = supplier!.id;

      // 1. Estimates
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('id, total_amount, sales_tax_percent')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'APPROVED');

      const estimateTotal = estimates?.reduce((s, e) => s + (e.total_amount || 0), 0) || 0;
      const salesTaxPercent = estimates?.[0]?.sales_tax_percent || 0;
      const estimateIds = estimates?.map(e => e.id) || [];

      // 2. Estimate items by pack
      let estimateItemsByPack: Record<string, number> = {};
      if (estimateIds.length > 0) {
        const { data: items } = await supabase
          .from('supplier_estimate_items')
          .select('pack_name, line_total')
          .in('estimate_id', estimateIds);
        (items || []).forEach(item => {
          const pack = item.pack_name || 'Uncategorized';
          estimateItemsByPack[pack] = (estimateItemsByPack[pack] || 0) + (item.line_total || 0);
        });
      }

      // 3. POs with line items
      const { data: allPOs } = await supabase
        .from('purchase_orders')
        .select('id, status, created_at, delivered_at, sales_tax_percent, po_line_items(description, line_total, source_estimate_item_id, source_pack_name, created_at)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true });

      const activePOs = (allPOs || []).filter(po => ['PRICED', 'ORDERED', 'DELIVERED'].includes(po.status));
      const submittedPOs = (allPOs || []).filter(po => po.status === 'SUBMITTED');

      // 4. Returns
      const { data: returns } = await supabase
        .from('returns')
        .select('net_credit_total')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'CLOSED');
      const creditsTotal = returns?.reduce((s, r) => s + (r.net_credit_total || 0), 0) || 0;

      // Compute totals
      let materialsOrdered = 0;
      let deliveredTotal = 0;
      const orderedByPack: Record<string, number> = {};
      const unmatchedMap: Record<string, { orderedCost: number; deliveredCost: number; poIds: Set<string>; firstSeen: string }> = {};

      // Chart buckets
      const chartBuckets = new Map<string, { ordered: number; delivered: number }>();

      activePOs.forEach(po => {
        const items = (po.po_line_items as any[]) || [];
        const taxMult = 1 + ((po as any).sales_tax_percent || 0) / 100;
        let poSubtotal = 0;
        items.forEach(li => {
          const cost = li.line_total || 0;
          poSubtotal += cost;

          // Pack tracking (tax-inclusive)
          const costWithTax = cost * taxMult;
          const pack = li.source_pack_name || null;
          if (pack) {
            orderedByPack[pack] = (orderedByPack[pack] || 0) + costWithTax;
          }

          // Unmatched items (tax-inclusive)
          if (!li.source_estimate_item_id) {
            const key = li.description || 'Unknown Item';
            if (!unmatchedMap[key]) {
              unmatchedMap[key] = { orderedCost: 0, deliveredCost: 0, poIds: new Set(), firstSeen: li.created_at || po.created_at };
            }
            unmatchedMap[key].orderedCost += costWithTax;
            unmatchedMap[key].poIds.add(po.id);
            if (po.status === 'DELIVERED') {
              unmatchedMap[key].deliveredCost += costWithTax;
            }
          }
        });

        const poTotal = poSubtotal * taxMult;
        materialsOrdered += poTotal;
        if (po.status === 'DELIVERED') deliveredTotal += poTotal;

        // Chart data
        const monthKey = po.created_at.slice(0, 7);
        const bucket = chartBuckets.get(monthKey) || { ordered: 0, delivered: 0 };
        bucket.ordered += poTotal;
        if (po.status === 'DELIVERED') bucket.delivered += poTotal;
        chartBuckets.set(monthKey, bucket);
      });

      const deliveredNet = deliveredTotal - creditsTotal;
      const orderedVariance = materialsOrdered - estimateTotal;

      // Forecast logic
      const allPackNames = new Set([...Object.keys(estimateItemsByPack), ...Object.keys(orderedByPack)]);
      const orderedPacks: { deltaPct: number; estimateAmt: number }[] = [];
      const unorderedPacks: { name: string; estimateAmt: number }[] = [];

      allPackNames.forEach(pack => {
        const est = estimateItemsByPack[pack] || 0;
        const ord = orderedByPack[pack] || 0;
        if (ord > 0 && est > 0) {
          orderedPacks.push({ deltaPct: (ord - est) / est, estimateAmt: est });
        } else if (est > 0 && ord === 0) {
          unorderedPacks.push({ name: pack, estimateAmt: est });
        }
      });

      const totalOrderedEstimate = orderedPacks.reduce((s, p) => s + p.estimateAmt, 0);
      let weightedAvgDeltaPct = 0;
      if (totalOrderedEstimate > 0) {
        weightedAvgDeltaPct = orderedPacks.reduce((s, p) => s + p.deltaPct * (p.estimateAmt / totalOrderedEstimate), 0);
      }

      const remainingEstimate = unorderedPacks.reduce((s, p) => s + p.estimateAmt, 0);
      const forecastFinal = materialsOrdered + remainingEstimate * (1 + weightedAvgDeltaPct);
      const forecastVariance = forecastFinal - estimateTotal;
      const forecastConfidence: 'low' | 'medium' | 'high' = orderedPacks.length < 3 ? 'low' : orderedPacks.length < 8 ? 'medium' : 'high';

      // Packs over budget
      const packsOverBudget: PackComparison[] = [];
      allPackNames.forEach(pack => {
        const est = estimateItemsByPack[pack] || 0;
        const ord = orderedByPack[pack] || 0;
        if (ord > est && est > 0) {
          packsOverBudget.push({
            packName: pack,
            estimateTotal: est,
            orderedTotal: ord,
            overBudget: ord - est,
            overBudgetPct: ((ord - est) / est) * 100,
          });
        }
      });
      packsOverBudget.sort((a, b) => b.overBudget - a.overBudget);

      // Unmatched items
      const unmatchedItems: UnmatchedItem[] = Object.entries(unmatchedMap).map(([desc, d]) => ({
        description: desc,
        orderedCost: d.orderedCost,
        deliveredCost: d.deliveredCost,
        poCount: d.poIds.size,
        firstSeen: d.firstSeen,
      })).sort((a, b) => b.orderedCost - a.orderedCost);

      // Risk factors
      let unpricedItems = 0;
      submittedPOs.forEach(po => {
        unpricedItems += ((po.po_line_items as any[]) || []).length;
      });

      const biggestUpcoming = unorderedPacks.sort((a, b) => b.estimateAmt - a.estimateAmt)[0] || null;

      const riskFactors: RiskFactors = {
        unpricedItems,
        unpricedPOs: submittedPOs.length,
        packsNotStarted: unorderedPacks.length,
        totalPacks: allPackNames.size,
        biggestUpcomingPack: biggestUpcoming ? { name: biggestUpcoming.name, amount: biggestUpcoming.estimateAmt } : null,
      };

      // Chart data
      const sorted = Array.from(chartBuckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let cumOrdered = 0;
      let cumDelivered = 0;
      const chartData = sorted.map(([month, vals]) => {
        cumOrdered += vals.ordered;
        cumDelivered += vals.delivered;
        const [y, m] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: `${monthNames[parseInt(m) - 1]} ${y}`,
          budget: estimateTotal,
          ordered: cumOrdered,
          delivered: Math.max(0, cumDelivered - creditsTotal),
        };
      });

      // Last updated
      const lastPO = activePOs[activePOs.length - 1];
      const lastUpdated = lastPO?.created_at || null;

      return {
        estimateTotal,
        salesTaxPercent,
        materialsOrdered,
        deliveredTotal,
        creditsTotal,
        deliveredNet,
        orderedVariance,
        orderedVariancePct: estimateTotal > 0 ? (orderedVariance / estimateTotal) * 100 : 0,
        forecastFinal,
        forecastVariance,
        forecastVariancePct: estimateTotal > 0 ? (forecastVariance / estimateTotal) * 100 : 0,
        forecastConfidence,
        forecastOrderedPacks: orderedPacks.length,
        packsOverBudget,
        unmatchedItems,
        riskFactors,
        chartData,
        lastUpdated,
      };
    },
    enabled: !!projectId && !!supplierOrgId && !!supplier?.id,
  });

  return useMemo(() => ({
    loading: isLoading || !data,
    estimateTotal: data?.estimateTotal || 0,
    salesTaxPercent: data?.salesTaxPercent || 0,
    materialsOrdered: data?.materialsOrdered || 0,
    deliveredTotal: data?.deliveredTotal || 0,
    creditsTotal: data?.creditsTotal || 0,
    deliveredNet: data?.deliveredNet || 0,
    orderedVariance: data?.orderedVariance || 0,
    orderedVariancePct: data?.orderedVariancePct || 0,
    forecastFinal: data?.forecastFinal || 0,
    forecastVariance: data?.forecastVariance || 0,
    forecastVariancePct: data?.forecastVariancePct || 0,
    forecastConfidence: data?.forecastConfidence || 'low',
    forecastOrderedPacks: data?.forecastOrderedPacks || 0,
    packsOverBudget: data?.packsOverBudget || [],
    unmatchedItems: data?.unmatchedItems || [],
    riskFactors: data?.riskFactors || { unpricedItems: 0, unpricedPOs: 0, packsNotStarted: 0, totalPacks: 0, biggestUpcomingPack: null },
    chartData: data?.chartData || [],
    lastUpdated: data?.lastUpdated || null,
  }), [data, isLoading]);
}
