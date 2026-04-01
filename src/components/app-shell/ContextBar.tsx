import { ChevronRight, Search, Plus, User, Users, Settings, LogOut } from 'lucide-react';
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

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}


interface ContextBarProps {
  breadcrumbs: Breadcrumb[];
  onCommandPalette: () => void;
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
}

export function ContextBar({ breadcrumbs, onCommandPalette, showNewButton, onNewClick, newButtonLabel = 'New' }: ContextBarProps) {
  const navigate = useNavigate();
  const { profile, currentRole, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[52px] flex items-center justify-between px-4 bg-card/80 backdrop-blur-xl border-b border-border">
      {/* Left — Logo */}
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 min-w-[120px] hover:opacity-80 transition-opacity">
        <OntimeLogo className="w-7 h-7" />
        <span className="hidden sm:inline font-heading text-[1.1rem] font-extrabold tracking-[-0.3px] text-foreground leading-none">
          Ontime<span className="text-primary">.build</span>
        </span>
      </button>

      {/* Center — Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
            <button
              onClick={crumb.onClick}
              className={`${
                i === breadcrumbs.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              } transition-colors`}
              disabled={!crumb.onClick}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        <button
          onClick={onCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground text-xs transition-colors"
        >
          <Search className="w-3 h-3" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline ml-1 px-1 py-0.5 rounded bg-muted/40 text-[10px] font-mono">⌘K</kbd>
        </button>

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
  );
}
