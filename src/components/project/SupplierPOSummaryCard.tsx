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

export function SupplierPOSummaryCard({ projectId, supplierOrgId }: SupplierPOSummaryCardProps) {
  // First get the supplier_id from the org_id
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

  const { data: statusCounts, isLoading } = useQuery({
    queryKey: ['supplier-po-status', projectId, supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id);

      if (error) throw error;

      return {
        awaiting_pricing: data?.filter((p) => p.status === 'SUBMITTED').length || 0,
        priced: data?.filter((p) => p.status === 'PRICED').length || 0,
        finalized: data?.filter((p) => p.status === 'FINALIZED').length || 0,
        ready_for_delivery: data?.filter((p) => p.status === 'READY_FOR_DELIVERY').length || 0,
        delivered: data?.filter((p) => p.status === 'DELIVERED').length || 0,
      };
    },
    enabled: !!projectId && !!supplier?.id,
  });

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
      </CardContent>
    </Card>
  );
}
