import { useEffect, useState } from 'react';
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
  Lock,
  LogOut,
  ChevronDown,
  Activity,
  ListChecks,
  Wallet,
  HardHat,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarAttention } from '@/hooks/useSidebarAttention';
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

interface NavGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

function getNavGroups(isTM: boolean): NavGroup[] {
  return [
    {
      key: 'pulse',
      label: 'Pulse',
      icon: Activity,
      items: [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, route: 'overview' },
        { key: 'setup', label: 'Project Info', icon: Settings2, route: 'setup' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      icon: ListChecks,
      items: [
        ...(!isTM ? [{ key: 'sov', label: 'Schedule of Values', icon: DollarSign, route: 'sov', featureKey: 'sov_contracts', hideForSupplier: true } as NavItem] : []),
        { key: 'change-orders', label: isTM ? 'Work Orders' : 'Change Orders', icon: AlertTriangle, route: 'change-orders', featureKey: 'change_orders' },
        { key: 'rfis', label: 'RFIs', icon: MessageSquareMore, route: 'rfis', premium: true },
        { key: 'estimates', label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
      ],
    },
    {
      key: 'money',
      label: 'Money',
      icon: Wallet,
      items: [
        { key: 'invoices', label: 'Invoices', icon: Receipt, route: 'invoices', featureKey: 'invoicing' },
        { key: 'purchase-orders', label: 'Purchase Orders', icon: Package, route: 'purchase-orders', featureKey: 'purchase_orders' },
        { key: 'returns', label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
        { key: 'backcharges', label: 'Backcharges', icon: AlertTriangle, route: 'backcharges' },
        { key: 'payment-apps', label: 'Payment Apps', icon: FileText, route: 'payment-apps', hideForSupplier: true },
      ],
    },
    {
      key: 'field',
      label: 'Field',
      icon: HardHat,
      items: [
        { key: 'schedule', label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt', premium: true, hideForSupplier: true },
        { key: 'daily-log', label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs', premium: true, hideForSupplier: true },
      ],
    },
    {
      key: 'docs',
      label: 'Docs',
      icon: FolderOpen,
      items: [
        { key: 'settings', label: 'Project Settings', icon: Settings2, route: 'settings' },
      ],
    },
  ];
}

const UTILITY_ITEMS = [
  { key: 'team', label: 'My Team', icon: Users, path: '/org/team' },
  { key: 'partners', label: 'Partners', icon: Handshake, path: '/partners' },
  { key: 'reminders', label: 'Reminders', icon: Bell, path: '/reminders' },
];

function AttentionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0">
      {count}
    </span>
  );
}

function NavItemButton({
  item,
  active,
  projectId,
  attentionCount,
}: {
  item: NavItem;
  active: boolean;
  projectId: string;
  attentionCount?: number;
}) {
  const navigate = useNavigate();
  const enabled = useFeatureEnabled(item.featureKey as any);
  if (item.featureKey && !enabled) return null;
  const Icon = item.icon;
  return (
    <button
      onClick={() => navigate(`/project/${projectId}/${item.route}`)}
      className={cn(
        'flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-left w-full',
        active
          ? 'bg-white/15 text-white'
          : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
      <span className="truncate flex-1">{item.label}</span>
      {attentionCount && attentionCount > 0 ? <AttentionBadge count={attentionCount} /> : null}
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
  const { profile, signOut, userOrgRoles } = useAuth();
  const attentionCounts = useSidebarAttention(id);
  const currentOrg = userOrgRoles[0]?.organization;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  const groups = getNavGroups(isTM);

  // Determine which group contains the active route
  const activeGroupKey =
    groups.find((g) => g.items.some((i) => i.route === activeSection))?.key || 'pulse';

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [activeGroupKey]: true,
  }));

  // When route changes, ensure containing group is open
  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, [activeGroupKey]: true }));
  }, [activeGroupKey]);

  if (!id) return null;

  return (
    <aside className="hidden lg:flex flex-col w-[200px] xl:w-[220px] shrink-0 bg-[hsl(var(--foreground))] text-white fixed left-0 top-[52px] bottom-0 z-40">
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

        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => !(item.hideForSupplier && isSupplier));
          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[group.key] ?? false;
          const GroupIcon = group.icon;
          const groupAttention = visibleItems.reduce(
            (sum, i) => sum + (attentionCounts[i.route] || 0),
            0
          );
          const groupActive = visibleItems.some((i) => i.route === activeSection);

          return (
            <div key={group.key} className="mb-0.5">
              <button
                onClick={() =>
                  setOpenGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                }
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors text-left w-full',
                  groupActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                <GroupIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span className="flex-1">{group.label}</span>
                {groupAttention > 0 && <AttentionBadge count={groupAttention} />}
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform',
                    isOpen ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItemButton
                      key={item.key}
                      item={item}
                      active={activeSection === item.route}
                      projectId={id}
                      attentionCount={attentionCounts[item.route]}
                    />
                  ))}
                </div>
              )}
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
                'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full',
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

      {/* Bottom pinned — Logo, Settings, Profile, Sign out */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        {currentOrg?.logo_url && (
          <div className="px-3 pb-2">
            <img
              src={currentOrg.logo_url}
              alt={currentOrg.name || 'Company'}
              className="max-h-9 max-w-[140px] object-contain rounded"
            />
          </div>
        )}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Settings</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
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
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left w-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
