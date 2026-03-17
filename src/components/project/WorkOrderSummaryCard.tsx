import { useEffect, useState } from 'react';
import { ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrderSummaryCardProps {
  projectId: string;
}

interface WorkOrderTotals {
  tcToGcTotal: number;
  tcToFcTotal: number;
  tcInternalCostTotal: number;
  fcEarnings: number;
  approvedCount: number;
  pendingCount: number;
  totalCount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WorkOrderSummaryCard({ projectId }: WorkOrderSummaryCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<string>('Trade Contractor');
  const [totals, setTotals] = useState<WorkOrderTotals>({
    tcToGcTotal: 0, tcToFcTotal: 0, tcInternalCostTotal: 0, fcEarnings: 0,
    approvedCount: 0, pendingCount: 0, totalCount: 0,
  });

  useEffect(() => {
    const fetchWorkOrders = async () => {
      if (!user) { setLoading(false); return; }

      const { data: memberships } = await supabase
        .from('user_org_roles').select('organization_id').eq('user_id', user.id);
      const userOrgIds = (memberships || []).map(m => m.organization_id);
      let currentRole = 'Trade Contractor';
      let currentOrgId: string | null = null;

      if (userOrgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team').select('role, org_id').eq('project_id', projectId).in('org_id', userOrgIds);
        if (teamMembers && teamMembers.length > 0) {
          currentRole = teamMembers[0].role;
          currentOrgId = teamMembers[0].org_id;
        }
      }
      setViewerRole(currentRole);

      const isFCView = currentRole === 'Field Crew';
      const isTCView = currentRole === 'Trade Contractor';
      const isSupplierView = currentRole === 'Supplier';

      if ((isFCView || isSupplierView) && currentOrgId) {
        const { data: participations } = await supabase
          .from('change_order_participants').select('change_order_id')
          .eq('organization_id', currentOrgId).eq('is_active', true);
        const participatedWOIds = (participations || []).map(p => p.change_order_id);

        if (participatedWOIds.length === 0) {
          setTotals({ tcToGcTotal: 0, tcToFcTotal: 0, tcInternalCostTotal: 0, fcEarnings: 0, approvedCount: 0, pendingCount: 0, totalCount: 0 });
          setLoading(false); return;
        }

        const { data: workOrders } = await supabase
          .from('change_order_projects').select('id, status')
          .eq('project_id', projectId).in('id', participatedWOIds);
        const projectWorkOrderIds = (workOrders || []).map(wo => wo.id);

        let approvedCount = 0, pendingCount = 0;
        for (const wo of workOrders || []) {
          if (wo.status === 'approved' || wo.status === 'contracted') approvedCount++;
          else if (wo.status !== 'draft') pendingCount++;
        }

        let fcEarnings = 0;
        if (isFCView && projectWorkOrderIds.length > 0) {
          const { data: fcHours } = await supabase
            .from('change_order_fc_hours').select('hours, hourly_rate, labor_total')
            .in('change_order_id', projectWorkOrderIds);
          fcEarnings = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || (fc.hours * (fc.hourly_rate || 0))), 0);
        }

        setTotals({ tcToGcTotal: 0, tcToFcTotal: 0, tcInternalCostTotal: 0, fcEarnings, approvedCount, pendingCount, totalCount: projectWorkOrderIds.length });
        setLoading(false); return;
      }

      const { data: workOrders, error } = await supabase
        .from('change_order_projects')
        .select('id, status, final_price, labor_total, material_total, equipment_total, linked_po_id, tc_internal_cost')
        .eq('project_id', projectId);

      if (error) { console.error('Error fetching work orders:', error); setLoading(false); return; }

      let tcToGcTotal = 0, tcToFcTotal = 0, tcInternalCostTotal = 0, approvedCount = 0, pendingCount = 0;

      for (const wo of workOrders || []) {
        if (wo.status === 'approved' || wo.status === 'contracted') {
          approvedCount++;
          tcToGcTotal += wo.final_price || 0;
        } else if (wo.status !== 'draft') {
          pendingCount++;
        }
      }

      if (isTCView) {
        const approvedIds = (workOrders || []).filter(wo => ['approved', 'contracted'].includes(wo.status)).map(wo => wo.id);
        if (approvedIds.length > 0) {
          const { data: fcHours } = await supabase
            .from('change_order_fc_hours').select('labor_total').in('change_order_id', approvedIds);
          tcToFcTotal = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
        }
        tcInternalCostTotal = (workOrders || [])
          .filter(wo => ['approved', 'contracted'].includes(wo.status))
          .reduce((sum, wo) => sum + ((wo as any).tc_internal_cost || 0), 0);
      }

      setTotals({ tcToGcTotal, tcToFcTotal, tcInternalCostTotal, fcEarnings: 0, approvedCount, pendingCount, totalCount: (workOrders || []).length });
      setLoading(false);
    };
    if (projectId) fetchWorkOrders();
  }, [projectId, user]);

  if (loading) {
    return (
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />Work Orders</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
    );
  }

  const isTCView = viewerRole === 'Trade Contractor';
  const isFCView = viewerRole === 'Field Crew';
  const isSupplierView = viewerRole === 'Supplier';
  const profit = totals.tcToGcTotal - totals.tcToFcTotal - totals.tcInternalCostTotal;
  const profitPercent = totals.tcToGcTotal > 0 ? (profit / totals.tcToGcTotal) * 100 : 0;

  return (
    <Card data-sasha-card="Work Orders">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {(isFCView || isSupplierView) ? 'My Work Orders' : 'Work Orders'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-green-600">{totals.approvedCount}</p><p className="text-xs text-muted-foreground">Approved</p></div>
          <div><p className="text-2xl font-bold text-amber-600">{totals.pendingCount}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          <div><p className="text-2xl font-bold">{totals.totalCount}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </div>
        {isTCView ? (
          <div className="pt-3 border-t space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Work Order Revenue</span><span className="font-medium">{formatCurrency(totals.tcToGcTotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Field Crew Cost</span><span className="font-medium text-orange-600">-{formatCurrency(totals.tcToFcTotal)}</span></div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-600" />Work Order Profit</span>
              <div className="text-right"><span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</span><span className="text-xs text-muted-foreground ml-2">({profitPercent.toFixed(1)}%)</span></div>
            </div>
          </div>
        ) : isFCView ? (
          <div className="pt-3 border-t"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">My Earnings</span><span className="text-lg font-bold text-green-600">{formatCurrency(totals.fcEarnings)}</span></div></div>
        ) : isSupplierView ? null : (
          <div className="pt-3 border-t"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Work Order Total</span><span className="text-lg font-bold">{formatCurrency(totals.tcToGcTotal)}</span></div></div>
        )}
      </CardContent>
    </Card>
  );
}
