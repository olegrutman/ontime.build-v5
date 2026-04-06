import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PLATFORM_ROLE_LABELS } from '@/types/platform';
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  ScrollText,
  LogOut,
  Shield,
  CreditCard,
  Settings,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/platform', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/platform/orgs', icon: Building2, label: 'Organizations' },
  { to: '/platform/users', icon: Users, label: 'Users' },
  { to: '/platform/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/platform/plans', icon: CreditCard, label: 'Plans & Features' },
  { to: '/platform/rules', icon: ShieldCheck, label: 'Role Rules' },
  { to: '/platform/kpis', icon: BarChart3, label: 'KPI Cards' },
  { to: '/platform/gc-dashboard', icon: BarChart3, label: 'GC Dashboard' },
  { to: '/platform/setup', icon: Settings, label: 'Setup' },
  { to: '/platform/logs', icon: ScrollText, label: 'Support Logs' },
];

export { NAV_ITEMS };

export function PlatformSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, platformRole, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-sidebar-primary" />
          <span className="font-semibold text-sm">Platform Admin</span>
        </div>
        <p className="text-xs text-sidebar-foreground/60 mt-1 truncate">
          {profile?.full_name || profile?.email}
        </p>
        <p className="text-xs text-sidebar-primary font-medium">
          {platformRole ? PLATFORM_ROLE_LABELS[platformRole] : ''}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function PlatformSidebar() {
  return (
    <aside className="hidden lg:flex w-64 h-screen flex-col border-r border-sidebar-border shrink-0">
      <PlatformSidebarContent />
    </aside>
  );
}
