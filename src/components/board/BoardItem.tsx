import * as React from 'react';
import { MoreHorizontal, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';

interface BoardItemProps {
  id: string;
  title: string;
  subtitle?: string;
  assignee?: { name: string; avatar?: string };
  dueDate?: string;
  tags?: { label: string; color: string }[];
  onClick?: () => void;
  actions?: HoverAction[];
  menuActions?: { label: string; onClick: () => void; destructive?: boolean }[];
  className?: string;
}

export function BoardItem({
  id,
  title,
  subtitle,
  assignee,
  dueDate,
  tags,
  onClick,
  actions,
  menuActions,
  className,
}: BoardItemProps) {
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className={cn(
        'group p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all',
        className
      )}
      onClick={onClick}
    >
      {/* Header with title and menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-2 flex-1">{title}</h4>
        
        <div className="flex items-center gap-1 shrink-0">
          {/* Hover Actions */}
          {actions && actions.length > 0 && (
            <HoverActions actions={actions} />
          )}
          
          {/* Menu */}
          {menuActions && menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={handleMenuClick}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={handleMenuClick}>
                {menuActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={action.destructive ? 'text-destructive' : ''}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{subtitle}</p>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Footer with assignee and due date */}
      {(assignee || dueDate) && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
          {assignee && (
            <div className="flex items-center gap-1.5">
              {assignee.avatar ? (
                <img
                  src={assignee.avatar}
                  alt={assignee.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
              )}
              <span className="truncate max-w-[100px]">{assignee.name}</span>
            </div>
          )}
          {dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{dueDate}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Compact variant for dense boards
export function BoardItemCompact({
  title,
  color,
  onClick,
}: {
  title: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'p-2 bg-card rounded border cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all',
        'flex items-center gap-2'
      )}
      onClick={onClick}
    >
      {color && (
        <div
          className="w-1.5 h-4 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm truncate">{title}</span>
    </div>
  );
}
