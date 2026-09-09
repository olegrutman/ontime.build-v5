import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSidebarAttention(projectId: string | undefined) {
  const { user, userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization_id;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId || !user) return;

    const fetch = async () => {
      // CO attention = COs submitted for review UNION active FC input requests.
      // Fetch ids (not head counts) so the two sets can be unioned without
      // double-counting a CO that is both submitted and input-requested.
      const collabPromise = currentOrgId
        ? supabase.from('change_order_collaborators')
            .select('co_id, change_orders!inner(id, status)')
            .eq('organization_id', currentOrgId)
            .eq('status', 'active')
            .eq('change_orders.project_id', projectId)
        : Promise.resolve({ data: [] as any[] });

      // Supplier estimates waiting on the buyer's approval. Suppliers author
      // them, so their own submissions must not badge their nav.
      const estimatePromise = currentOrgId
        ? supabase.from('supplier_estimates').select('id, supplier_org_id')
            .eq('project_id', projectId).eq('status', 'SUBMITTED')
        : Promise.resolve({ data: [] as any[] });

      const [coRes, collabRes, invRes, poSubmittedRes, poPendingRes, rfiRes, bcRes, rfiNewRes, estRes] = await Promise.all([
        supabase.from('change_orders').select('id')
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        collabPromise,
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).in('status', ['ORDERED', 'READY_FOR_DELIVERY']),
        supabase.from('project_rfis').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).in('status', ['open', 'in_review']),
        supabase.from('backcharges').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'pending'),
        supabase.from('rfis').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'open'),
        estimatePromise,
      ]);

      const coIds = new Set((coRes.data || []).map((r: any) => r.id));
      for (const c of (collabRes.data || []) as any[]) {
        const co = c.change_orders;
        if (co && !['approved', 'completed', 'contracted', 'rejected'].includes((co.status || '').toLowerCase())) {
          coIds.add(c.co_id);
        }
      }

      const result: Record<string, number> = {};
      if (coIds.size > 0) result['change-orders'] = coIds.size;
      if (invRes.count && invRes.count > 0) result['invoices'] = invRes.count;
      // Combine SUBMITTED POs (need pricing) + ORDERED/READY (pending delivery)
      const poTotal = (poSubmittedRes.count || 0) + (poPendingRes.count || 0);
      if (poTotal > 0) result['purchase-orders'] = poTotal;
      const rfiTotal = (rfiRes.count || 0) + (rfiNewRes.count || 0);
      if (rfiTotal > 0) result['rfis'] = rfiTotal;
      if (bcRes.count && bcRes.count > 0) result['backcharges'] = bcRes.count;
      setCounts(result);
    };

    fetch();
  }, [projectId, user, currentOrgId]);

  return counts;
}
