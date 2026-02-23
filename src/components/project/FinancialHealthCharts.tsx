import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface FinancialHealthChartsProps {
  financials: ProjectFinancials;
  hideMaterialCards?: boolean;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

export function FinancialHealthCharts({ financials, hideMaterialCards }: FinancialHealthChartsProps) {
  const { viewerRole, materialEstimate, materialOrdered, billedToDate, retainageAmount, workOrderTotal, monthlyWOData } = financials;

  if (viewerRole === 'Supplier') return null;

  const charts: React.ReactNode[] = [];

  // Material Estimate vs Actual (GC + TC)
  if (!hideMaterialCards && (viewerRole === 'Trade Contractor' || viewerRole === 'General Contractor') && (materialEstimate > 0 || materialOrdered > 0)) {
    const overBudget = materialOrdered > materialEstimate;
    const data = [
      { name: 'Estimate', value: materialEstimate },
      { name: 'Ordered', value: materialOrdered },
    ];
    charts.push(
      <Card key="mat" className="overflow-hidden">
        <CardContent className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Material Estimate vs Orders</p>
          <div className="h-[140px] sm:h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={50} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={overBudget ? 'hsl(0, 72%, 50%)' : 'hsl(var(--primary))'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {overBudget && (
            <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-medium">
              ⚠ Orders exceed estimate by {fmt(materialOrdered - materialEstimate)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // TC: Margin Position Trend
  if (viewerRole === 'Trade Contractor' && monthlyWOData.length > 0) {
    charts.push(
      <Card key="margin" className="overflow-hidden">
        <CardContent className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Margin Position Trend</p>
          <div className="h-[140px] sm:h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyWOData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={m => m.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={50} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="hsl(var(--muted))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="margin" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Cumulative Margin" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // FC: Earned vs Invoiced vs Retainage
  if (viewerRole === 'Field Crew') {
    const data = [
      { name: 'Earned (Approved WOs)', value: workOrderTotal },
      { name: 'Invoiced', value: billedToDate },
      { name: 'Retainage', value: retainageAmount },
    ];
    charts.push(
      <Card key="fc" className="overflow-hidden">
        <CardContent className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Earned vs Invoiced vs Retainage</p>
          <div className="h-[140px] sm:h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={50} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (charts.length === 0) return null;

  return (
    <div className={cn("grid gap-3", charts.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-lg')}>
      {charts}
    </div>
  );
}
