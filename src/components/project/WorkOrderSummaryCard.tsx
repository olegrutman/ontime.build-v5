import { useEffect, useState } from 'react';
import { ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { enrichWorkOrderTotals } from '@/lib/computeWorkOrderTotal';

interface WorkOrderSummaryCardProps {
  projectId: string;
}

interface WorkOrderTotals {
  tcToGcTotal: number;
  tcToFcTotal: number;
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
    tcToGcTotal: 0,
    tcToFcTotal: 0,
    fcEarnings: 0,
    approvedCount: 0,
    pendingCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    const fetchWorkOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Determine viewer role and org based on current user's organization
      const { data: memberships } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', user.id);
      
      const userOrgIds = (memberships || []).map(m => m.organization_id);
      let currentRole = 'Trade Contractor';
      let currentOrgId: string | null = null;
      
      if (userOrgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team')
          .select('role, org_id')
          .eq('project_id', projectId)
          .in('org_id', userOrgIds);
        
        if (teamMembers && teamMembers.length > 0) {
          currentRole = teamMembers[0].role;
          currentOrgId = teamMembers[0].org_id;
        }
      }

      setViewerRole(currentRole);

      const isFCView = currentRole === 'Field Crew';
      const isTCView = currentRole === 'Trade Contractor';
      const isSupplierView = currentRole === 'Supplier';

      // For FC and Supplier: only fetch work orders they participated in
      if ((isFCView || isSupplierView) && currentOrgId) {
        // Get work orders where this org is a participant
        const { data: participations } = await supabase
          .from('change_order_participants')
          .select('change_order_id')
          .eq('organization_id', currentOrgId)
          .eq('is_active', true);

        const participatedWOIds = (participations || []).map(p => p.change_order_id);

        if (participatedWOIds.length === 0) {
          setTotals({
            tcToGcTotal: 0,
            tcToFcTotal: 0,
            fcEarnings: 0,
            approvedCount: 0,
            pendingCount: 0,
            totalCount: 0,
          });
          setLoading(false);
          return;
        }

        // Get work order statuses - filter by current project
        const { data: workOrders } = await supabase
          .from('change_order_projects')
          .select('id, status')
          .eq('project_id', projectId)
          .in('id', participatedWOIds);
        
        const projectWorkOrderIds = (workOrders || []).map(wo => wo.id);

        let approvedCount = 0;
        let pendingCount = 0;

        for (const wo of workOrders || []) {
          if (wo.status === 'approved' || wo.status === 'contracted') {
            approvedCount++;
          } else if (wo.status !== 'draft') {
            pendingCount++;
          }
        }

        // For FC: also calculate their labor earnings using filtered project IDs
        let fcEarnings = 0;
        if (isFCView && projectWorkOrderIds.length > 0) {
          const { data: fcHours } = await supabase
            .from('change_order_fc_hours')
            .select('change_order_id, hours, hourly_rate, labor_total')
            .in('change_order_id', projectWorkOrderIds);

          fcEarnings = (fcHours || []).reduce((sum, fc) => {
            return sum + (fc.labor_total || (fc.hours * (fc.hourly_rate || 0)));
          }, 0);
        }

        setTotals({
          tcToGcTotal: 0,
          tcToFcTotal: 0,
          fcEarnings,
          approvedCount,
          pendingCount,
          totalCount: projectWorkOrderIds.length,
        });
        setLoading(false);
        return;
      }

      // For TC and GC: fetch all work orders for this project
      const { data: workOrders, error } = await supabase
        .from('change_order_projects')
        .select('id, status, final_price, labor_total, material_total, equipment_total, created_by_role, linked_po_id, material_markup_type, material_markup_percent, material_markup_amount')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching work orders:', error);
        setLoading(false);
        return;
      }

      // Enrich totals with linked PO materials
      const enrichedTotals = await enrichWorkOrderTotals(
        (workOrders || []).map(wo => ({
          id: wo.id,
          labor_total: wo.labor_total || 0,
          material_total: wo.material_total || 0,
          equipment_total: wo.equipment_total || 0,
          final_price: wo.final_price || 0,
          linked_po_id: wo.linked_po_id,
          material_markup_type: wo.material_markup_type,
          material_markup_percent: wo.material_markup_percent,
          material_markup_amount: wo.material_markup_amount,
        }))
      );

      // Calculate totals
      let tcToGcTotal = 0;
      let tcToFcTotal = 0;
      let approvedCount = 0;
      let pendingCount = 0;

      for (const wo of workOrders || []) {
        const total = enrichedTotals.get(wo.id) || wo.final_price || 0;
        tcToGcTotal += total;
        
        if (wo.status === 'approved' || wo.status === 'contracted') {
          approvedCount++;
        } else if (wo.status !== 'draft') {
          pendingCount++;
        }
      }

      // Fetch FC labor totals for profit calculation (TC only)
      if (isTCView) {
        const workOrderIds = (workOrders || []).map(wo => wo.id);
        
        if (workOrderIds.length > 0) {
          const { data: fcHours } = await supabase
            .from('change_order_fc_hours')
            .select('change_order_id, labor_total')
            .in('change_order_id', workOrderIds);

          tcToFcTotal = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
        }
      }

      setTotals({
        tcToGcTotal,
        tcToFcTotal,
        fcEarnings: 0,
        approvedCount,
        pendingCount,
        totalCount: (workOrders || []).length,
      });
      setLoading(false);
    };

    if (projectId) {
      fetchWorkOrders();
    }
  }, [projectId, user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isTCView = viewerRole === 'Trade Contractor';
  const isFCView = viewerRole === 'Field Crew';
  const isSupplierView = viewerRole === 'Supplier';
  
  const profit = totals.tcToGcTotal - totals.tcToFcTotal;
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
        {/* Counts Row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{totals.approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{totals.pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totals.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Financial Summary - Role specific */}
        {isTCView ? (
          <div className="pt-3 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Work Order Revenue</span>
              <span className="font-medium">{formatCurrency(totals.tcToGcTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Field Crew Cost</span>
              <span className="font-medium text-orange-600">-{formatCurrency(totals.tcToFcTotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Work Order Profit
              </span>
              <div className="text-right">
                <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({profitPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        ) : isFCView ? (
          /* FC sees only their earnings */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">My Earnings</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totals.fcEarnings)}</span>
            </div>
          </div>
        ) : isSupplierView ? (
          /* Supplier sees just the count summary - no financial details */
          null
        ) : (
          /* GC sees work order totals */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Work Order Total</span>
              <span className="text-lg font-bold">{formatCurrency(totals.tcToGcTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
