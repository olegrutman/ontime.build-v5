import { Plus, User, Users, Settings, LogOut } from 'lucide-react';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { NotificationSheet } from '@/components/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContextBarProps {
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
}

export function ContextBar({ showNewButton, onNewClick, newButtonLabel = 'New' }: ContextBarProps) {
  const navigate = useNavigate();
  const { profile, currentRole, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[52px] flex items-center justify-between px-3 sm:px-4 bg-card/80 backdrop-blur-xl border-b border-border">
      {/* Left — Logo */}
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity shrink-0">
        <OntimeLogo className="w-7 h-7" />
        <span className="hidden sm:inline font-heading text-[1.1rem] font-extrabold tracking-[-0.3px] text-foreground leading-none">
          Ontime<span className="text-primary">.build</span>
        </span>
      </button>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
        <NotificationSheet />

        {showNewButton && (
          <>
            {/* Desktop: labeled button */}
            <Button size="sm" onClick={onNewClick} className="gap-1.5 h-9 hidden lg:flex">
              <Plus className="h-4 w-4" />
              <span>{newButtonLabel}</span>
            </Button>
            {/* Mobile: icon-only */}
            <Button size="sm" onClick={onNewClick} className="h-9 w-9 p-0 rounded-lg lg:hidden">
              <Plus className="h-4.5 w-4.5" />
            </Button>
          </>
        )}

        <div className="lg:hidden">
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
      </div>
    </header>
  );
}
