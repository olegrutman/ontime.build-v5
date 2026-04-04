import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CollapseToggle — shared "Show all / Show less" button used at card footers.
 */
interface CollapseToggleProps {
  expanded: boolean;
  totalCount: number;
  onToggle: () => void;
  className?: string;
}

export function CollapseToggle({ expanded, totalCount, onToggle, className }: CollapseToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full py-2.5 text-[0.8rem] text-primary font-medium hover:bg-accent/30 transition-colors flex items-center justify-center gap-1',
        className,
      )}
    >
      {expanded ? 'Show less' : `Show all (${totalCount})`}
      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
    </button>
  );
}
