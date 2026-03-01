import { Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  supplierOrgId: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function pct(value: number, base: number) {
  if (!base) return '—';
  return `${value >= 0 ? '+' : ''}${((value / base) * 100).toFixed(1)}%`;
}

export function SupplierMaterialsControlCard({ projectId, supplierOrgId }: Props) {
  const { data: supplier } = useQuery({
    queryKey: ['supplier-by-org', supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id').eq('organization_id', supplierOrgId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!supplierOrgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-materials-control', projectId, supplierOrgId, supplier?.id],
    queryFn: async () => {
      // Estimate total
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'APPROVED');
      const estimateTotal = estimates?.reduce((s, e) => s + (e.total_amount || 0), 0) || 0;

      // Committed POs with line items + source_estimate_id
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, status, source_estimate_id, created_at, delivered_at, po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .in('status', ['PRICED', 'ORDERED', 'READY_FOR_DELIVERY', 'FINALIZED', 'DELIVERED']);

      let committedTotal = 0;
      let committedFromEstimate = 0;
      let committedAdditional = 0;
      let deliveredTotal = 0;

      pos?.forEach(po => {
        const subtotal = (po.po_line_items as any[])?.reduce((s: number, li: any) => s + (li.line_total || 0), 0) || 0;
        committedTotal += subtotal;
        if (po.source_estimate_id) committedFromEstimate += subtotal;
        else committedAdditional += subtotal;
        if (po.status === 'DELIVERED') deliveredTotal += subtotal;
      });

      // Returns
      const { data: returns } = await supabase
        .from('returns')
        .select('net_credit_total')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'CLOSED');
      const returnedTotal = returns?.reduce((s, r) => s + (r.net_credit_total || 0), 0) || 0;

      const netDelivered = deliveredTotal - returnedTotal;
      const committedVariance = committedTotal - estimateTotal;
      const deliveredVariance = netDelivered - estimateTotal;

      return {
        estimateTotal, committedTotal, committedFromEstimate, committedAdditional,
        deliveredTotal, returnedTotal, netDelivered, committedVariance, deliveredVariance,
      };
    },
    enabled: !!projectId && !!supplierOrgId && !!supplier?.id,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2"><Skeleton className="h-5 w-52" /></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const rows: { label: string; value: string; sub?: string; variant?: 'default' | 'positive' | 'negative' }[] = [
    { label: 'Estimate Total', value: fmt(data.estimateTotal) },
    { label: 'Committed Total', value: fmt(data.committedTotal), sub: `From Estimate ${fmt(data.committedFromEstimate)} · Additional ${fmt(data.committedAdditional)}` },
    { label: 'Delivered Total', value: fmt(data.deliveredTotal) },
    { label: 'Returned / Credited', value: fmt(data.returnedTotal) },
    { label: 'Net Delivered', value: fmt(data.netDelivered) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-primary" />
          Materials Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{r.label}</span>
              <span className="font-semibold text-sm">{r.value}</span>
            </div>
            {r.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{r.sub}</p>}
          </div>
        ))}

        <Separator />

        {/* Variances */}
        <VarianceRow
          label="Committed Variance"
          dollar={data.committedVariance}
          base={data.estimateTotal}
        />
        <VarianceRow
          label="Delivered Variance"
          dollar={data.deliveredVariance}
          base={data.estimateTotal}
        />
      </CardContent>
    </Card>
  );
}

function VarianceRow({ label, dollar, base }: { label: string; dollar: number; base: number }) {
  const isOver = dollar > 0;
  const isZero = dollar === 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        {!isZero && (isOver
          ? <TrendingUp className="h-3.5 w-3.5 text-destructive" />
          : <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        )}
        <span className={cn(
          'font-bold text-sm',
          isZero ? 'text-muted-foreground' : isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400',
        )}>
          {dollar >= 0 ? '+' : ''}{fmt(dollar)} ({pct(dollar, base)})
        </span>
      </div>
    </div>
  );
}
