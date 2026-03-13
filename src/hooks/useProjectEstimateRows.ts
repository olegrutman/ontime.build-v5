import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EstimateRow } from '@/hooks/useSupplierDashboardData';

export function useProjectEstimateRows(projectId: string, supplierOrgId: string | null) {
  return useQuery<EstimateRow[]>({
    queryKey: ['project-estimate-rows', projectId, supplierOrgId],
    queryFn: async () => {
      // 1. Fetch estimates for this project + supplier
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('id, name, status, total_amount, project_id')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId!)
        .in('status', ['APPROVED', 'SUBMITTED']);

      if (!estimates?.length) return [];

      const estimateIds = estimates.map(e => e.id);

      // 2. Fetch estimate items for pack names
      const { data: items } = await supabase
        .from('supplier_estimate_items')
        .select('estimate_id, pack_name')
        .in('estimate_id', estimateIds);

      // 3. Fetch POs linked to these estimates
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, source_estimate_id, source_pack_name, po_total, status')
        .eq('project_id', projectId)
        .not('source_estimate_id', 'is', null);

      // Build ordered maps
      const orderedByEstimate: Record<string, number> = {};
      const orderedPacksByEstimate: Record<string, Set<string>> = {};
      (pos || []).forEach(po => {
        if (po.source_estimate_id && po.status !== 'ACTIVE') {
          orderedByEstimate[po.source_estimate_id] = (orderedByEstimate[po.source_estimate_id] || 0) + (po.po_total || 0);
          if (po.source_pack_name) {
            if (!orderedPacksByEstimate[po.source_estimate_id]) {
              orderedPacksByEstimate[po.source_estimate_id] = new Set();
            }
            orderedPacksByEstimate[po.source_estimate_id].add(po.source_pack_name);
          }
        }
      });

      // 4. Get project name
      const { data: proj } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      return estimates.map(est => {
        const estItems = (items || []).filter(i => i.estimate_id === est.id);
        const packs = [...new Set(estItems.map(i => i.pack_name).filter(Boolean))] as string[];
        const orderedAmt = orderedByEstimate[est.id] || 0;
        const total = est.total_amount || 0;
        return {
          id: est.id,
          name: est.name,
          projectName: proj?.name || 'Unknown',
          projectId: est.project_id,
          totalAmount: total,
          lineItemCount: estItems.length,
          packNames: packs,
          orderedPackNames: [...(orderedPacksByEstimate[est.id] || [])],
          orderedAmount: orderedAmt,
          orderedPercent: total > 0 ? Math.min(Math.round((orderedAmt / total) * 100), 100) : 0,
          status: est.status,
        };
      });
    },
    enabled: !!projectId && !!supplierOrgId,
  });
}
