import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
  /** Position from bottom to clear bottom nav (default 60px) */
  bottomOffset?: number;
}

/**
 * Fixed-bottom action bar for primary mobile actions (Save, Submit, Approve).
 * Sits above the bottom nav with safe-area padding.
 * Only visible on mobile (md:hidden).
 */
export function StickyActionBar({ children, className, bottomOffset = 60 }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 md:hidden',
        'bg-card/95 backdrop-blur-lg border-t border-border',
        'px-4 py-3',
        className
      )}
      style={{
        bottom: `max(${bottomOffset}px, calc(${bottomOffset}px + env(safe-area-inset-bottom)))`,
      }}
    >
      <div className="flex items-center gap-2 [&>button]:min-h-[44px] [&>button]:flex-1">
        {children}
      </div>
    </div>
  );
}
