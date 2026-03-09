import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface PhaseCardGroupProps {
  phaseName: string;
  totalDays: number;
  children: React.ReactNode;
}

export function PhaseCardGroup({ phaseName, totalDays, children }: PhaseCardGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2 px-1 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {phaseName}
          </div>
          <span className="text-xs font-normal">{totalDays}d total</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
