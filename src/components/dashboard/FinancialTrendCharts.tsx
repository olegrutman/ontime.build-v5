import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, BarChart3 } from 'lucide-react';
import type { MonthlySpend, MonthlyWorkOrders } from '@/hooks/useFinancialTrends';

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface FinancialTrendChartsProps {
  spendTrend: MonthlySpend[];
  woTrend: MonthlyWorkOrders[];
  loading: boolean;
}

export function FinancialTrendCharts({ spendTrend, woTrend, loading }: FinancialTrendChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const hasSpendData = spendTrend.some(d => d.billed > 0 || d.paid > 0);
  const hasWoData = woTrend.some(d => d.created > 0 || d.approved > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Spend Over Time */}
      <Card data-sasha-card="Billing Trend">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Billing Trend (6 mo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasSpendData ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No billing data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={spendTrend}>
                <defs>
                  <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={50} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrencyShort(value), name === 'billed' ? 'Billed' : 'Paid']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="billed" stroke="hsl(var(--primary))" fill="url(#billedGrad)" strokeWidth={2} name="billed" />
                <Area type="monotone" dataKey="paid" stroke="hsl(142 76% 36%)" fill="url(#paidGrad)" strokeWidth={2} name="paid" />
                <Legend formatter={(value) => value === 'billed' ? 'Billed' : 'Paid'} wrapperStyle={{ fontSize: '12px' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Work Order Completion Trend */}
      <Card data-sasha-card="Work Order Trend">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Work Orders (6 mo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasWoData ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No work order data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={woTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [value, name === 'created' ? 'Created' : 'Approved']}
                />
                <Bar dataKey="created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="created" />
                <Bar dataKey="approved" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="approved" />
                <Legend formatter={(value) => value === 'created' ? 'Created' : 'Approved'} wrapperStyle={{ fontSize: '12px' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
