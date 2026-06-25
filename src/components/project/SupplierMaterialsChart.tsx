import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface Props {
  projectId: string;
  supplierOrgId: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const chartConfig = {
  committed: { label: 'Committed', color: 'hsl(var(--primary))' },
  netDelivered: { label: 'Net Delivered', color: 'hsl(142 71% 45%)' },
  estimate: { label: 'Estimate', color: 'hsl(var(--muted-foreground))' },
};

export function SupplierMaterialsChart({ projectId, supplierOrgId }: Props) {
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
    queryKey: ['supplier-materials-chart', projectId, supplierOrgId, supplier?.id],
    queryFn: async () => {
      // Estimate
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'APPROVED');
      const estimateTotal = estimates?.reduce((s, e) => s + (e.total_amount || 0), 0) || 0;

      // POs
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, status, created_at, delivered_at, po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .in('status', ['PRICED', 'ORDERED', 'READY_FOR_DELIVERY', 'FINALIZED', 'DELIVERED'])
        .order('created_at', { ascending: true });

      // Returns
      const { data: returns } = await supabase
        .from('returns')
        .select('net_credit_total, closed_at')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .eq('status', 'CLOSED');
      const returnedTotal = returns?.reduce((s, r) => s + (r.net_credit_total || 0), 0) || 0;

      return { estimateTotal, pos: pos || [], returnedTotal };
    },
    enabled: !!projectId && !!supplierOrgId && !!supplier?.id,
  });

  const chartData = useMemo(() => {
    if (!data?.pos?.length) return [];

    // Bucket by month
    const buckets = new Map<string, { committed: number; delivered: number }>();

    data.pos.forEach(po => {
      const subtotal = (po.po_line_items as any[])?.reduce((s: number, li: any) => s + (li.line_total || 0), 0) || 0;
      const monthKey = format(parseISO(po.created_at), 'yyyy-MM');
      const existing = buckets.get(monthKey) || { committed: 0, delivered: 0 };
      existing.committed += subtotal;
      if (po.status === 'DELIVERED' && po.delivered_at) {
        const delMonth = format(parseISO(po.delivered_at), 'yyyy-MM');
        const delBucket = buckets.get(delMonth) || { committed: 0, delivered: 0 };
        delBucket.delivered += subtotal;
        buckets.set(delMonth, delBucket);
      } else if (po.status === 'DELIVERED') {
        existing.delivered += subtotal;
      }
      buckets.set(monthKey, existing);
    });

    // Sort and cumulate
    const sorted = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let cumCommitted = 0;
    let cumDelivered = 0;

    return sorted.map(([month, vals]) => {
      cumCommitted += vals.committed;
      cumDelivered += vals.delivered;
      return {
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        committed: cumCommitted,
        netDelivered: Math.max(0, cumDelivered - (data.returnedTotal || 0)),
        estimate: data.estimateTotal,
      };
    });
  }, [data]);

  const committedTotal = chartData.length > 0 ? chartData[chartData.length - 1]?.committed || 0 : 0;
  const estimateTotal = data?.estimateTotal || 0;
  const overBudget = committedTotal > estimateTotal;
  const variance = committedTotal - estimateTotal;
  const variancePct = estimateTotal > 0 ? ((variance / estimateTotal) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><Skeleton className="h-5 w-44" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Materials Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">No committed purchase orders yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Materials Over Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value) => fmt(value as number)}
              />}
            />
            <ReferenceLine
              y={estimateTotal}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 4"
              label={{ value: 'Estimate', position: 'right', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Line type="monotone" dataKey="committed" stroke="var(--color-committed)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="netDelivered" stroke="var(--color-netDelivered)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>

        {/* Forecast banner */}
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
          overBudget
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
            : 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300',
        )}>
          {overBudget ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Current commitments exceed estimate by <strong>{fmt(variance)}</strong> (+{variancePct}%)</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Currently within estimate</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
