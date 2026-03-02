import { BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SupplierEstimateVsOrdersCardProps {
  projectId: string;
  supplierOrgId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SupplierEstimateVsOrdersCard({
  projectId,
  supplierOrgId,
}: SupplierEstimateVsOrdersCardProps) {
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

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-estimate-vs-orders', projectId, supplierOrgId, supplier?.id],
    queryFn: async () => {
      // Sum estimates (APPROVED + SUBMITTED)
      const { data: estimates, error: estError } = await supabase
        .from('supplier_estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .in('status', ['APPROVED', 'SUBMITTED']);

      if (estError) throw estError;

      const totalEstimates = estimates?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;

      // Sum finalized PO line totals
      const { data: pos, error: poError } = await supabase
        .from('purchase_orders')
        .select('sales_tax_percent, po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .in('status', ['SUBMITTED', 'PRICED', 'ORDERED', 'DELIVERED']);

      if (poError) throw poError;

      const totalOrders = pos?.reduce((sum, po) => {
        const subtotal = po.po_line_items?.reduce((s: number, li: any) => s + (li.line_total || 0), 0) || 0;
        return sum + subtotal;
      }, 0) || 0;

      return { totalEstimates, totalOrders };
    },
    enabled: !!projectId && !!supplierOrgId && !!supplier?.id,
  });

  if (isLoading || !supplier) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalEstimates = data?.totalEstimates || 0;
  const totalOrders = data?.totalOrders || 0;
  const difference = totalOrders - totalEstimates;
  const progressPercent = totalEstimates > 0 ? Math.min((totalOrders / totalEstimates) * 100, 100) : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Estimates vs Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Estimates</span>
          <span className="font-semibold">{formatCurrency(totalEstimates)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Orders (POs)</span>
          <span className="font-semibold">{formatCurrency(totalOrders)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Difference</span>
          <span
            className={cn(
              'font-bold',
              difference >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Orders vs Estimates</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
