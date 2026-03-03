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

        {/* Mobile account avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-full">
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
            <DropdownMenuSeparator />

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
  );
}
