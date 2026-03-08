import { cn } from '@/lib/utils';

interface SOVProgressBarProps {
  scheduledValue: number;
  billedToDate: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SOVProgressBar({ 
  scheduledValue, 
  billedToDate, 
  showLabels = false,
  size = 'md' 
}: SOVProgressBarProps) {
  const percentage = scheduledValue > 0 
    ? Math.min((billedToDate / scheduledValue) * 100, 100)
    : 0;
  
  const isOverbilled = billedToDate > scheduledValue && scheduledValue > 0;
  const overbilledPercent = isOverbilled 
    ? ((billedToDate - scheduledValue) / scheduledValue) * 100 
    : 0;

  // Color coding based on percentage
  const getProgressColor = () => {
    if (isOverbilled) return 'bg-red-500';
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-slate-400';
  };

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1 tabular-nums">
          <span>{formatCurrency(billedToDate)} billed</span>
          <span>{formatCurrency(scheduledValue)} scheduled</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heightClass)}>
        <div className="flex h-full">
          {/* Main progress */}
          <div
            className={cn("transition-all duration-300", getProgressColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          {/* Overbilled indicator */}
          {isOverbilled && (
            <div
              className="bg-red-600 animate-pulse"
              style={{ width: `${Math.min(overbilledPercent, 50)}%` }}
            />
          )}
        </div>
      </div>
      {showLabels && (
        <div className="flex justify-between items-center mt-1">
          <span className={cn(
            "text-xs font-medium",
            isOverbilled ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {percentage.toFixed(0)}% complete
            {isOverbilled && ' (overbilled!)'}
          </span>
          {scheduledValue > 0 && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(scheduledValue - billedToDate)} remaining
            </span>
          )}
        </div>
      )}
    </div>
  );
}
