import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings2,
  DollarSign,
  AlertTriangle,
  MessageSquareMore,
  FileText,
  Receipt,
  Package,
  RotateCcw,
  CalendarDays,
  PenLine,
  ArrowLeft,
  Users,
  Handshake,
  Bell,
  Settings,
  User,
  Lock,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  route: string;
  featureKey?: string;
  hideForSupplier?: boolean;
  premium?: boolean;
}

function getNavGroups(isTM: boolean): NavItem[][] {
  return [
    [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, route: 'overview' },
      { key: 'setup', label: 'Project Info', icon: Settings2, route: 'setup' },
      ...(!isTM ? [{ key: 'sov', label: 'Schedule of Values', icon: DollarSign, route: 'sov', featureKey: 'sov_contracts' } as NavItem] : []),
    ],
    [
      { key: 'change-orders', label: isTM ? 'Work Orders' : 'Change Orders', icon: AlertTriangle, route: 'change-orders', featureKey: 'change_orders' },
      { key: 'rfis', label: 'RFIs', icon: MessageSquareMore, route: 'rfis', premium: true },
      { key: 'estimates', label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
    ],
    [
      { key: 'invoices', label: 'Invoices', icon: Receipt, route: 'invoices', featureKey: 'invoicing' },
      { key: 'purchase-orders', label: 'Purchase Orders', icon: Package, route: 'purchase-orders', featureKey: 'purchase_orders' },
      { key: 'returns', label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
    ],
    [
      { key: 'schedule', label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt', premium: true },
      { key: 'daily-log', label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs', premium: true },
    ],
  ];
}

const UTILITY_ITEMS = [
  { key: 'team', label: 'My Team', icon: Users, path: '/org/team' },
  { key: 'partners', label: 'Partners', icon: Handshake, path: '/partners' },
  { key: 'reminders', label: 'Reminders', icon: Bell, path: '/reminders' },
];

function FeatureNavItem({
  item,
  active,
  projectId,
}: {
  item: NavItem;
  active: boolean;
  projectId: string;
}) {
  const navigate = useNavigate();
  const enabled = useFeatureEnabled(item.featureKey as any);
  if (!enabled) return null;

  const Icon = item.icon;
  return (
    <button
      onClick={() => navigate(`/project/${projectId}/${item.route}`)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full',
        active
          ? 'bg-white/15 text-white'
          : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
      <span className="truncate flex-1">{item.label}</span>
      {item.premium && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
    </button>
  );
}

interface ProjectSidebarProps {
  isSupplier?: boolean;
  isTM?: boolean;
}

export function ProjectSidebar({ isSupplier = false, isTM = false }: ProjectSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (!id) return null;

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  return (
    <aside className="hidden lg:flex flex-col w-[200px] xl:w-[220px] shrink-0 bg-[hsl(var(--foreground))] text-white min-h-[calc(100vh-52px)]">
      {/* Scrollable nav area */}
      <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4 overflow-y-auto">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:text-white hover:bg-white/10 mb-2"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Dashboard</span>
        </button>

        <div className="w-full h-px bg-white/10 mb-2" />

        {getNavGroups(isTM).map((group, gi) => {
          const visibleItems = group.filter(
            (item) => !(item.hideForSupplier && isSupplier)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi}>
              {gi > 0 && <div className="w-full h-px bg-white/10 my-2" />}
              {visibleItems.map((item) => {
                const active = activeSection === item.route;
                const Icon = item.icon;

                if (item.featureKey) {
                  return (
                    <FeatureNavItem
                      key={item.key}
                      item={item}
                      active={active}
                      projectId={id}
                    />
                  );
                }

                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(`/project/${id}/${item.route}`)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full',
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.premium && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Utility section */}
        <div className="w-full h-px bg-white/10 my-2" />
        {UTILITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom pinned — Settings, Profile, Sign out */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Settings</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{profile?.full_name || 'Profile'}</span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
