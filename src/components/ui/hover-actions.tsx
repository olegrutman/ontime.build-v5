import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface HoverAction {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface HoverActionsProps {
  actions: HoverAction[];
  className?: string;
  position?: 'left' | 'right';
  alwaysVisible?: boolean;
}

export function HoverActions({
  actions,
  className,
  position = 'right',
  alwaysVisible = false,
}: HoverActionsProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center gap-0.5 transition-opacity duration-200',
          !alwaysVisible && 'opacity-0 group-hover:opacity-100',
          position === 'left' ? 'mr-auto' : 'ml-auto',
          className
        )}
      >
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-7 w-7 shrink-0',
                  action.variant === 'destructive' &&
                    'hover:bg-destructive/10 hover:text-destructive'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(e);
                }}
                disabled={action.disabled}
              >
                {action.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {action.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Wrapper component that adds group class for hover detection
export function HoverActionsContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('group', className)}>{children}</div>;
}
