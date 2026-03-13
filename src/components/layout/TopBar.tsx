import { Plus, User, Users, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationSheet } from '@/components/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

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
  const navigate = useNavigate();
  const { profile, currentRole, permissions, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      {/* Mobile topbar: 52px, logo + actions */}
      <header className="sticky top-0 z-40 flex items-center border-b bg-card backdrop-blur px-3 h-[52px] lg:hidden">
        {/* Logo wordmark */}
        <div className="flex items-center gap-2 min-w-0">
          <img src="/ontime-logo.png" alt="OnTime" className="w-7 h-7 shrink-0" />
          <span className="font-heading text-sm font-bold text-foreground tracking-tight">OnTime.Build</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationSheet />

          {showNewButton && (
            <Button size="sm" onClick={onNewClick} className="h-9 w-9 p-0 rounded-lg bg-secondary text-secondary-foreground">
              <Plus className="h-4.5 w-4.5" />
            </Button>
          )}

          {/* Mobile account avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {(currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/org/team')}>
                    <Users className="mr-2 h-4 w-4" />
                    My Team
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile page title band */}
      {title && (
        <div className="px-4 pt-3 pb-2 lg:hidden">
          <h1 className="font-heading text-[1.4rem] font-black text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[0.72rem] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      {/* Desktop topbar */}
      <header className="sticky top-0 z-40 hidden lg:flex h-16 items-center gap-4 border-b bg-card backdrop-blur px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6" />

        {title && (
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <NotificationSheet />

          {showNewButton && (
            <Button size="sm" onClick={onNewClick} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" />
              <span>{newButtonLabel}</span>
            </Button>
          )}
        </div>
      </header>
    </>
  );
}
