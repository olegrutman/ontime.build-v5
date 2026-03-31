import { cn } from '@/lib/utils';
import type { YesNoNa } from '@/types/framingScope';

interface ChildPanelProps {
  parentValue: YesNoNa;
  children: React.ReactNode;
}

export function ChildPanel({ parentValue, children }: ChildPanelProps) {
  if (parentValue !== 'yes') return null;

  return (
    <div className={cn(
      'ml-4 pl-4 border-l-2 border-primary/20 py-2 animate-fade-in'
    )}>
      {children}
    </div>
  );
}
