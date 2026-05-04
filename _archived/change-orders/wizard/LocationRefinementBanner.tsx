import { Button } from '@/components/ui/button';
import { Info, RefreshCw, Check, X } from 'lucide-react';

interface LocationRefinementBannerProps {
  currentTag: string;
  refinement: string;
  /** When true, accepting will re-run the match (destroys current picks). When false, just updates and keeps picks. */
  willReRun?: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function LocationRefinementBanner({
  currentTag,
  refinement,
  willReRun = false,
  onUpdate,
  onDismiss,
}: LocationRefinementBannerProps) {
  return (
    <div className="rounded-lg border-l-2 border-purple-500 bg-purple-50/60 dark:bg-purple-950/15 p-3 flex items-start gap-3">
      <Info className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
          Sasha thinks this is closer to "<span className="font-bold">{refinement}</span>"
          than "<span className="opacity-80">{currentTag}</span>".
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/30"
            onClick={onUpdate}
          >
            {willReRun ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1" /> Update & re-match
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" /> Update location (keep picks)
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={onDismiss}
          >
            <X className="h-3 w-3 mr-1" /> Keep current
          </Button>
        </div>
      </div>
    </div>
  );
}
