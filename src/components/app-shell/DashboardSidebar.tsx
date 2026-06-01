import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Users,
  Handshake,
  Bell,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABEL } from '@/contexts/RoleThemeContext';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Verb-grouped global nav: WORK / PROJECTS / NETWORK
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Work',
    items: [
      { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Reminders', icon: Bell, path: '/reminders' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { label: 'All Projects', icon: FolderKanban, path: '/projects/archive' },
    ],
  },
  {
    label: 'Network',
    items: [
      { label: 'My Team', icon: Users, path: '/org/team' },
      { label: 'Partners', icon: Handshake, path: '/partners' },
    ],
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, userOrgRoles, signOut } = useAuth();

  const currentOrg = userOrgRoles[0]?.organization;
  const orgName = currentOrg?.name || 'My Organization';
  const orgType = currentOrg?.type || '';

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="hidden lg:flex flex-col w-[200px] xl:w-[220px] shrink-0 bg-[hsl(var(--foreground))] text-white fixed top-0 left-0 bottom-0 z-40">
      {/* Top — Logo */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2.5 px-4 pt-4 pb-3 hover:opacity-80 transition-opacity"
      >
        <OntimeLogo className="w-7 h-7" />
        <span className="font-heading text-[1.05rem] font-extrabold tracking-[-0.3px] text-white leading-none">
          Ontime<span className="text-primary">.build</span>
        </span>
      </button>

      {/* Role chip — accent-colored, replaces gray subtitle */}
      {orgType && (
        <div className="px-4 pb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{
              backgroundColor: 'hsl(var(--role-accent))',
              color: 'hsl(var(--role-accent-foreground))',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
            {ROLE_LABEL[orgType] || orgType}
          </span>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex flex-col gap-0.5 p-3 pt-2 flex-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} className={cn(si > 0 && 'mt-3')}>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full',
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="mt-3">
          <button
            onClick={() => navigate('/settings')}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full',
              location.pathname === '/settings'
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            )}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* Company section — light card so logos stand out */}
      <div className="mx-3 mb-2 mt-2 rounded-xl bg-slate-100/95 px-3 py-3">
        {currentOrg?.logo_url && (
          <img
            src={currentOrg.logo_url}
            alt={orgName}
            className="max-h-[100px] max-w-[170px] object-contain mx-auto block mb-2"
          />
        )}
        <p className="text-[0.8rem] font-semibold text-slate-900 truncate leading-tight">{orgName}</p>
      </div>

      {/* Profile + Sign Out */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/80 truncate flex-1">
            {profile?.full_name || 'Profile'}
          </span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2.5 w-full px-2 py-2 mt-0.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-left text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
