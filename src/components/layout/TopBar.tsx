import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6 hidden sm:block" />

      {/* Page Title */}
      {title && (
        <div className="hidden md:block min-w-0">
          <h1 className="text-sm font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      )}

      {/* Search - hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-full pl-9 h-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Mobile title - visible only on mobile */}
      {title && (
        <div className="flex-1 md:hidden min-w-0">
          <h1 className="text-sm font-semibold truncate">{title}</h1>
        </div>
      )}

      {/* Spacer for desktop when no title */}
      {!title && <div className="flex-1" />}

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        {showNewButton && (
          <Button size="sm" onClick={onNewClick} className="gap-1.5 h-9 px-2 sm:px-3">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{newButtonLabel}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
