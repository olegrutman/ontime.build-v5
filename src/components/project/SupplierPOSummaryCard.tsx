import { Package, Clock, CheckCircle, Truck, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SupplierPOSummaryCardProps {
  projectId: string;
  supplierOrgId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function SupplierPOSummaryCard({ projectId, supplierOrgId }: SupplierPOSummaryCardProps) {
  const { data: supplier } = useQuery({
    queryKey: ['supplier-by-org', supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', supplierOrgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!supplierOrgId,
  });

  const { data: poData, isLoading } = useQuery({
    queryKey: ['supplier-po-summary', projectId, supplier?.id],
    queryFn: async () => {
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select('id, status, sales_tax_percent')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .neq('status', 'ACTIVE');

      if (error) throw error;

      const statusCounts = {
        awaiting_pricing: pos?.filter((p) => p.status === 'SUBMITTED').length || 0,
        priced: pos?.filter((p) => p.status === 'PRICED').length || 0,
        finalized: pos?.filter((p) => p.status === 'FINALIZED').length || 0,
        ready_for_delivery: pos?.filter((p) => p.status === 'READY_FOR_DELIVERY').length || 0,
        delivered: pos?.filter((p) => p.status === 'DELIVERED').length || 0,
      };

      // Fetch line item totals for financial summary
      let subtotal = 0;
      let totalWithTax = 0;

      if (pos && pos.length > 0) {
        const poIds = pos.map((p) => p.id);
        const { data: lineItems } = await supabase
          .from('po_line_items')
          .select('po_id, line_total')
          .in('po_id', poIds);

        // Sum line totals per PO, then apply tax
        const poTotals = new Map<string, number>();
        (lineItems || []).forEach((item) => {
          const current = poTotals.get(item.po_id) || 0;
          poTotals.set(item.po_id, current + (item.line_total || 0));
        });

        pos.forEach((po) => {
          const poSubtotal = poTotals.get(po.id) || 0;
          subtotal += poSubtotal;
          const taxRate = (po.sales_tax_percent || 0) / 100;
          totalWithTax += poSubtotal * (1 + taxRate);
        });
      }

      return { statusCounts, subtotal, totalWithTax };
    },
    enabled: !!projectId && !!supplier?.id,
  });

  const statusCounts = poData?.statusCounts;
  const urgentCount = statusCounts?.awaiting_pricing || 0;

  if (isLoading || !supplier) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', urgentCount > 0 && 'border-amber-500/50')}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Purchase Orders
          </div>
          {urgentCount > 0 && <Badge variant="destructive">{urgentCount}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{urgentCount} need pricing</span>
          </div>
        )}
        {(statusCounts?.priced || 0) > 0 && (
          <div className="flex items-center gap-2 text-primary">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">{statusCounts?.priced} awaiting approval</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">{statusCounts?.finalized || 0} finalized</span>
        </div>
        {(statusCounts?.ready_for_delivery || 0) > 0 && (
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <Truck className="h-4 w-4" />
            <span className="text-sm">{statusCounts?.ready_for_delivery} ready to ship</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="h-4 w-4" />
          <span className="text-sm">{statusCounts?.delivered || 0} delivered</span>
        </div>

        {/* Financial total with tax */}
        {(poData?.subtotal || 0) > 0 && (
          <div className="pt-2 border-t space-y-1">
            {poData!.totalWithTax !== poData!.subtotal && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(poData!.subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium">
              <span>Total{poData!.totalWithTax !== poData!.subtotal ? ' (incl. tax)' : ''}</span>
              <span>{formatCurrency(poData!.totalWithTax)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
