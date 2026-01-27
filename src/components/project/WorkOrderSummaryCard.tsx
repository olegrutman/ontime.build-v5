import { useEffect, useState } from 'react';
import { ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrderSummaryCardProps {
  projectId: string;
  viewerRole?: string;
}

interface WorkOrderTotals {
  tcToGcTotal: number;
  tcToFcTotal: number;
  approvedCount: number;
  pendingCount: number;
  totalCount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function WorkOrderSummaryCard({ projectId, viewerRole = 'Trade Contractor' }: WorkOrderSummaryCardProps) {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<WorkOrderTotals>({
    tcToGcTotal: 0,
    tcToFcTotal: 0,
    approvedCount: 0,
    pendingCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    const fetchWorkOrders = async () => {
      // Fetch all work orders for this project
      const { data: workOrders, error } = await supabase
        .from('change_order_projects')
        .select('id, status, final_price, labor_total, material_total, equipment_total, created_by_role')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching work orders:', error);
        setLoading(false);
        return;
      }

      // Calculate totals
      let tcToGcTotal = 0;
      let tcToFcTotal = 0;
      let approvedCount = 0;
      let pendingCount = 0;

      for (const wo of workOrders || []) {
        const total = wo.final_price || 0;
        
        // TC to GC work orders (work the TC bills to GC)
        if (wo.created_by_role === 'General Contractor' || wo.created_by_role === 'Trade Contractor') {
          tcToGcTotal += total;
        }
        
        // TC to FC work orders (work the TC pays to FC) - from FC hours
        // We need to fetch FC labor totals separately
        
        if (wo.status === 'approved' || wo.status === 'contracted') {
          approvedCount++;
        } else if (wo.status !== 'draft') {
          pendingCount++;
        }
      }

      // Fetch FC labor totals for profit calculation
      const workOrderIds = (workOrders || []).map(wo => wo.id);
      
      if (workOrderIds.length > 0) {
        const { data: fcHours } = await supabase
          .from('change_order_fc_hours')
          .select('change_order_id, labor_total')
          .in('change_order_id', workOrderIds);

        tcToFcTotal = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
      }

      setTotals({
        tcToGcTotal,
        tcToFcTotal,
        approvedCount,
        pendingCount,
        totalCount: (workOrders || []).length,
      });
      setLoading(false);
    };

    if (projectId) {
      fetchWorkOrders();
    }
  }, [projectId]);

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
  const profit = totals.tcToGcTotal - totals.tcToFcTotal;
  const profitPercent = totals.tcToGcTotal > 0 ? (profit / totals.tcToGcTotal) * 100 : 0;
  const totalWorkOrderValue = isTCView ? totals.tcToGcTotal : totals.tcToGcTotal;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Work Orders
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

        {/* Financial Summary - TC only sees profit */}
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
        ) : (
          /* FC and GC just see totals */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Work Order Total</span>
              <span className="text-lg font-bold">{formatCurrency(totalWorkOrderValue)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
