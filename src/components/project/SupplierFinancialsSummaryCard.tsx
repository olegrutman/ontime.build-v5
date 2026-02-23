import { DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SupplierFinancialsSummaryCardProps {
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

export function SupplierFinancialsSummaryCard({
  projectId,
  supplierOrgId,
}: SupplierFinancialsSummaryCardProps) {
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

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-financials', projectId, supplier?.id],
    queryFn: async () => {
      // Get total from finalized POs (= contract value)
      const { data: pos, error: posError } = await supabase
        .from('purchase_orders')
        .select('id, sales_tax_percent, po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .in('status', ['FINALIZED', 'DELIVERED']);

      if (posError) throw posError;

      const totalContract =
        pos?.reduce((sum, po) => {
          const subtotal = po.po_line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
          const taxRate = (po.sales_tax_percent || 0) / 100;
          return sum + subtotal * (1 + taxRate);
        }, 0) || 0;

      // Get invoiced amounts (linked to these POs)
      const poIds = pos?.map((p) => p.id) || [];

      let totalInvoiced = 0;
      let totalPaid = 0;

      if (poIds.length > 0) {
        const { data: invoices, error: invError } = await supabase
          .from('invoices')
          .select('total_amount, status, po_id')
          .in('po_id', poIds);

        if (invError) throw invError;

        totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        totalPaid =
          invoices
            ?.filter((i) => i.status === 'PAID')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      }

      return { totalContract, totalInvoiced, totalPaid };
    },
    enabled: !!projectId && !!supplier?.id,
  });

  const outstanding = (data?.totalInvoiced || 0) - (data?.totalPaid || 0);

  if (isLoading || !supplier) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Order Value</span>
          <span className="font-semibold">{formatCurrency(data?.totalContract || 0)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Invoiced</span>
          <span className="font-medium">{formatCurrency(data?.totalInvoiced || 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Paid</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(data?.totalPaid || 0)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Outstanding</span>
          <span
            className={cn(
              'font-bold',
              outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
            )}
          >
            {formatCurrency(outstanding)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
