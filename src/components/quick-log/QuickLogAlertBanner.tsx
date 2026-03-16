import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface QuickLogAlertBannerProps {
  role: 'fc' | 'tc' | 'gc';
  openCount: number;
  openTotal: number;
  submittedCount: number;
  submittedTotal: number;
  onSubmit: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function QuickLogAlertBanner({ role, openCount, openTotal, submittedCount, submittedTotal, onSubmit }: QuickLogAlertBannerProps) {
  if (role === 'fc' && openCount > 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-800 dark:text-amber-200">
            {openCount} unsubmitted — log as you go to avoid month-end surprises
          </span>
          <Button size="sm" variant="outline" className="ml-4 border-amber-300 text-amber-700" onClick={onSubmit}>
            Submit <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (role === 'tc' && submittedCount > 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-200">
            {submittedCount} FC tasks not yet sent to GC — {fmt(submittedTotal)}
          </span>
          <Button size="sm" variant="outline" className="ml-4 border-blue-300 text-blue-700" onClick={onSubmit}>
            Bundle & send <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (role === 'gc' && submittedCount > 0) {
    return (
      <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
        <AlertTriangle className="h-4 w-4 text-purple-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-purple-800 dark:text-purple-200">
            {submittedCount} requests awaiting estimate
          </span>
          <Button size="sm" variant="outline" className="ml-4 border-purple-300 text-purple-700" onClick={onSubmit}>
            Follow up <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
