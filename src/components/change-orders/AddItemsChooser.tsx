import { useNavigate } from 'react-router-dom';
import { Mic, FileText, Plus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AddItemsChooserProps {
  projectId: string;
  coId: string;
  variant?: 'primary' | 'ghost';
  label?: string;
}

/**
 * Small route picker shown when adding scope items to an existing CO/WO.
 * Lets the user choose between voice-guided dictation and free-text
 * description — both append to the current CO via the intake page.
 */
export function AddItemsChooser({
  projectId,
  coId,
  variant = 'primary',
  label = 'Add scope item',
}: AddItemsChooserProps) {
  const navigate = useNavigate();

  const goVoice = () =>
    navigate(`/project/${projectId}/change-orders/intake?coId=${coId}&mode=voice`);
  const goDescribe = () =>
    navigate(`/project/${projectId}/change-orders/intake?coId=${coId}`);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === 'primary' ? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {label}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          How do you want to add?
        </p>
        <button
          onClick={goVoice}
          className={cn(
            'flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mic className="size-4" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Voice</span>
            <span className="text-[11px] text-muted-foreground">
              Hold to talk — AI extracts items
            </span>
          </span>
        </button>
        <button
          onClick={goDescribe}
          className={cn(
            'mt-1 flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Describe</span>
            <span className="text-[11px] text-muted-foreground">
              Type or paste — AI turns it into line items
            </span>
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
