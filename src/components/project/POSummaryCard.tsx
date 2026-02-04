import { useEffect, useState } from 'react';
import { Package, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface POSummaryCardProps {
  projectId: string;
}

interface POTotals {
  awaitingCount: number;
  inTransitCount: number;
  deliveredCount: number;
  totalCount: number;
  totalSpend: number;
  pendingPricingCount: number;
  baseCost: number;
  markupTotal: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function POSummaryCard({ projectId }: POSummaryCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<string>('Trade Contractor');
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [totals, setTotals] = useState<POTotals>({
    awaitingCount: 0,
    inTransitCount: 0,
    deliveredCount: 0,
    totalCount: 0,
    totalSpend: 0,
    pendingPricingCount: 0,
    baseCost: 0,
    markupTotal: 0,
  });

  useEffect(() => {
    const fetchPOs = async () => {
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
      const isSupplierView = currentRole === 'Supplier';
      const isTCView = currentRole === 'Trade Contractor';
      const isGCView = currentRole === 'General Contractor';
      
      // FC cannot view pricing
      setCanViewPricing(!isFCView);

      // Fetch all POs for this project
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select(`
          id, 
          status,
          pricing_owner_org_id,
          supplier:suppliers!purchase_orders_supplier_id_fkey(organization_id)
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching POs:', error);
        setLoading(false);
        return;
      }

      // Filter POs for supplier - they only see their own
      let filteredPOs = pos || [];
      if (isSupplierView && currentOrgId) {
        filteredPOs = filteredPOs.filter(po => 
          (po.supplier as { organization_id?: string })?.organization_id === currentOrgId
        );
      }

      // Calculate counts by status
      const awaitingCount = filteredPOs.filter(p => p.status === 'SUBMITTED').length;
      const inTransitCount = filteredPOs.filter(p => 
        ['ORDERED', 'READY_FOR_DELIVERY'].includes(p.status)
      ).length;
      const deliveredCount = filteredPOs.filter(p => p.status === 'DELIVERED').length;
      const pendingPricingCount = awaitingCount; // SUBMITTED means awaiting pricing

      // Fetch line items for pricing calculation (only if can view pricing)
      let totalSpend = 0;
      let baseCost = 0;
      let markupTotal = 0;
      
      if (!isFCView && filteredPOs.length > 0) {
        const poIds = filteredPOs.map(p => p.id);
        const { data: lineItems } = await supabase
          .from('po_line_items')
          .select('po_id, line_total')
          .in('po_id', poIds);
        
        totalSpend = (lineItems || []).reduce((sum, item) => sum + (item.line_total || 0), 0);
        baseCost = totalSpend;
        
        // For TC view, fetch linked work orders to calculate markup
        if (isTCView) {
          const { data: workOrders } = await supabase
            .from('change_order_projects')
            .select('linked_po_id, material_markup_type, material_markup_percent, material_markup_amount')
            .eq('project_id', projectId)
            .in('linked_po_id', poIds);
          
          if (workOrders && workOrders.length > 0) {
            // Calculate markup for each linked PO
            const poLineMap = new Map<string, number>();
            (lineItems || []).forEach(item => {
              const current = poLineMap.get(item.po_id) || 0;
              poLineMap.set(item.po_id, current + (item.line_total || 0));
            });
            
            workOrders.forEach(wo => {
              const poCost = poLineMap.get(wo.linked_po_id!) || 0;
              const markup = wo.material_markup_type === 'percent'
                ? poCost * ((wo.material_markup_percent || 0) / 100)
                : (wo.material_markup_amount || 0);
              markupTotal += markup;
            });
          }
        }
      }

      setTotals({
        awaitingCount,
        inTransitCount,
        deliveredCount,
        totalCount: filteredPOs.length,
        totalSpend,
        pendingPricingCount,
        baseCost,
        markupTotal,
      });
      setLoading(false);
    };

    if (projectId) {
      fetchPOs();
    }
  }, [projectId, user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Purchase Orders
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
  const isGCView = viewerRole === 'General Contractor';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          {isSupplierView ? 'My Purchase Orders' : 'Purchase Orders'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counts Row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-amber-600">{totals.awaitingCount}</p>
            <p className="text-xs text-muted-foreground">Awaiting</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{totals.inTransitCount}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Truck className="h-3 w-3" />
              In Transit
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totals.deliveredCount}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>

        {/* Financial Summary - Role specific */}
        {isSupplierView ? (
          /* Supplier sees pricing requests count */
          totals.pendingPricingCount > 0 ? (
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Awaiting Your Pricing</span>
                <span className="text-lg font-bold text-amber-600">{totals.pendingPricingCount}</span>
              </div>
            </div>
          ) : null
        ) : isFCView ? (
          /* FC sees just count summary - no financial details */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total POs</span>
              <span className="text-lg font-bold">{totals.totalCount}</span>
            </div>
          </div>
        ) : isTCView && canViewPricing ? (
          /* TC sees cost breakdown with markup */
          <div className="pt-3 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supplier Cost</span>
              <span>{formatCurrency(totals.baseCost)}</span>
            </div>
            {totals.markupTotal > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Markup</span>
                <span>+{formatCurrency(totals.markupTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1 border-t">
              <span className="text-sm">Total Revenue</span>
              <span>{formatCurrency(totals.baseCost + totals.markupTotal)}</span>
            </div>
          </div>
        ) : isGCView && canViewPricing ? (
          /* GC sees only final spend */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">PO Spend</span>
              <span className="text-lg font-bold">{formatCurrency(totals.totalSpend)}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
