import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ProjectSOVItem } from '@/hooks/useProjectSOV';
import { SOVProgressBar } from './SOVProgressBar';

interface SOVProgressSummaryProps {
  items: ProjectSOVItem[];
}

export function SOVProgressSummary({ items }: SOVProgressSummaryProps) {
  // Calculate totals
  const totalScheduled = items.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalBilled = items.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);
  const overallPercentage = totalScheduled > 0 ? (totalBilled / totalScheduled) * 100 : 0;
  
  // Count items by status
  const itemsWithValue = items.filter(item => (item.scheduled_value || 0) > 0);
  const completedItems = items.filter(item => 
    (item.scheduled_value || 0) > 0 && 
    (item.billed_to_date || 0) >= (item.scheduled_value || 0)
  );
  const overbilledItems = items.filter(item => 
    (item.scheduled_value || 0) > 0 && 
    (item.billed_to_date || 0) > (item.scheduled_value || 0)
  );
  const inProgressItems = items.filter(item => 
    (item.scheduled_value || 0) > 0 && 
    (item.billed_to_date || 0) > 0 &&
    (item.billed_to_date || 0) < (item.scheduled_value || 0)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (itemsWithValue.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Billing Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall progress bar */}
        <div className="mb-6">
          <SOVProgressBar
            scheduledValue={totalScheduled}
            billedToDate={totalBilled}
            showLabels
            size="lg"
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-semibold">{formatCurrency(totalScheduled)}</p>
            <p className="text-xs text-muted-foreground">Total Contract</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-semibold">{formatCurrency(totalBilled)}</p>
            <p className="text-xs text-muted-foreground">Total Billed</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-semibold">{completedItems.length}</p>
            <p className="text-xs text-muted-foreground">Completed Items</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            {overbilledItems.length > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                <p className="text-lg font-semibold text-red-600">{overbilledItems.length}</p>
                <p className="text-xs text-muted-foreground">Overbilled</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-semibold">{inProgressItems.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span>0-25%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>25-50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>50-75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>75-99%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Overbilled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
