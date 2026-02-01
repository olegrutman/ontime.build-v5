import * as React from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BoardColumnProps {
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
  collapsed?: boolean;
  onCollapse?: () => void;
  onAdd?: () => void;
  className?: string;
}

export function BoardColumn({
  title,
  color,
  count,
  children,
  collapsed = false,
  onCollapse,
  onAdd,
  className,
}: BoardColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg',
        collapsed && 'min-w-[48px] max-w-[48px]',
        className
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center gap-2 p-3 rounded-t-lg',
          collapsed && 'flex-col py-4'
        )}
        style={{ borderTop: `3px solid ${color}` }}
      >
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="writing-vertical-rl text-sm font-medium"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {title}
            </span>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: color, color: '#fff' }}
            >
              {count}
            </span>
          </div>
        ) : (
          <>
            <span
              className="text-xs font-medium px-2 py-1 rounded"
              style={{ backgroundColor: color, color: '#fff' }}
            >
              {count}
            </span>
            <span className="flex-1 font-medium text-sm truncate">{title}</span>
            {onAdd && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Column Content */}
      {!collapsed && (
        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
          {children}
        </div>
      )}
    </div>
  );
}

// Empty state for column
export function BoardColumnEmpty({ message = 'No items' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
      {message}
    </div>
  );
}
