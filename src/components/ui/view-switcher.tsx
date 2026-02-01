import * as React from 'react';
import { List, LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ViewMode = 'list' | 'board' | 'table';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  availableModes?: ViewMode[];
  className?: string;
}

const viewModeConfig: Record<ViewMode, { icon: React.ReactNode; label: string }> = {
  list: { icon: <List className="h-4 w-4" />, label: 'List View' },
  board: { icon: <LayoutGrid className="h-4 w-4" />, label: 'Board View' },
  table: { icon: <Table2 className="h-4 w-4" />, label: 'Table View' },
};

export function ViewSwitcher({
  value,
  onChange,
  availableModes = ['list', 'board', 'table'],
  className,
}: ViewSwitcherProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'inline-flex items-center rounded-lg border bg-card p-1 gap-0.5',
          className
        )}
      >
        {availableModes.map((mode) => {
          const config = viewModeConfig[mode];
          const isActive = value === mode;

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  )}
                  onClick={() => onChange(mode)}
                >
                  {config.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {config.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// Compact version for inline use
export function ViewSwitcherCompact({
  value,
  onChange,
  availableModes = ['list', 'board'],
  className,
}: ViewSwitcherProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {availableModes.map((mode) => {
        const config = viewModeConfig[mode];
        const isActive = value === mode;

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title={config.label}
          >
            {config.icon}
          </button>
        );
      })}
    </div>
  );
}
