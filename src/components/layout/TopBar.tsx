import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationSheet } from '@/components/notifications';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
}

export function TopBar({
  title,
  subtitle,
  showNewButton = false,
  onNewClick,
  newButtonLabel = 'New',
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 sm:gap-4 border-b bg-card backdrop-blur px-3 sm:px-4">
      <SidebarTrigger className="-ml-1 hidden lg:flex" />
      <Separator orientation="vertical" className="h-6 hidden sm:block" />

      {/* Page Title */}
      {title && (
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <NotificationSheet />
        
        {showNewButton && (
          <Button size="sm" onClick={onNewClick} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{newButtonLabel}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
