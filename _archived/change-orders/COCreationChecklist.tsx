import { Check, MapPin, FileQuestion, Hammer, DollarSign, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  done: boolean;
}

interface COCreationChecklistProps {
  projectId: string;
  hasLocation: boolean;
  hasReason: boolean;
  hasScopeItems: boolean;
  hasPricing: boolean;
  onScrollTo: (section: string) => void;
}

export function COCreationChecklist({
  projectId,
  hasLocation,
  hasReason,
  hasScopeItems,
  hasPricing,
  onScrollTo,
}: COCreationChecklistProps) {
  const navigate = useNavigate();
  const items: ChecklistItem[] = [
    { key: 'location', label: 'Location', icon: <MapPin className="h-3.5 w-3.5" />, done: hasLocation },
    { key: 'reason', label: 'Reason', icon: <FileQuestion className="h-3.5 w-3.5" />, done: hasReason },
    { key: 'scope', label: 'At least one scope item', icon: <Hammer className="h-3.5 w-3.5" />, done: hasScopeItems },
    { key: 'pricing', label: 'Pricing', icon: <DollarSign className="h-3.5 w-3.5" />, done: hasPricing },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-heading text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground">
            Setup Progress
          </h3>
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
            allDone
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-amber-500/10 text-amber-600'
          )}>
            {doneCount}/{items.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={() => navigate(`/project/${projectId}/change-orders/new`)}
        >
          <Wand2 className="h-3 w-3" /> Use guided wizard
        </Button>
      </div>
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              item.done
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer'
            )}
            onClick={() => !item.done && onScrollTo(item.key)}
          >
            {item.done ? (
              <Check className="h-3 w-3" />
            ) : (
              item.icon
            )}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
