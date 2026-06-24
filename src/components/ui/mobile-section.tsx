import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Badge content shown next to title */
  badge?: ReactNode;
}

/**
 * Collapsible section for grouping secondary details on mobile.
 * Expands/collapses with smooth animation.
 */
export function MobileSection({ title, children, defaultOpen = false, className, badge }: MobileSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-border rounded-xl overflow-hidden', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-3 border-t border-border">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
