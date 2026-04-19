import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  Handshake,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Partners', icon: Handshake, path: '/partners' },
  { label: 'Reminders', icon: FileText, path: '/reminders' },
  { label: 'My Team', icon: Users, path: '/org/team' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const ORG_TYPE_LABELS: Record<string, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  SUPPLIER: 'Supplier',
};

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
      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-3 pt-5 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
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
      </nav>

      {/* Company section */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Company
        </p>
        <div className="bg-white rounded-lg p-3 mb-2 shadow-sm flex items-center justify-center min-h-[64px]">
          {currentOrg?.logo_url ? (
            <img
              src={currentOrg.logo_url}
              alt={orgName}
              className="max-h-12 max-w-full object-contain"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--foreground))] text-white flex items-center justify-center text-sm font-bold">
              {orgName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
        </div>
        <p className="text-[0.8rem] font-semibold text-white truncate leading-tight">{orgName}</p>
        {orgType && (
          <span className="inline-block mt-1 text-[0.65rem] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
            {ORG_TYPE_LABELS[orgType] || orgType}
          </span>
        )}
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
