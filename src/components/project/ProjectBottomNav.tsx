import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Receipt,
  Package,
  Menu,
  DollarSign,
  MessageSquareMore,
  FileText,
  RotateCcw,
  CalendarDays,
  PenLine,
  Settings2,
  Users,
  Handshake,
  Bell,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { useAuth } from '@/hooks/useAuth';

interface BottomItem {
  label: string;
  icon: React.ElementType;
  route: string;
}

function getPrimaryItems(isTM: boolean): BottomItem[] {
  return [
    { label: 'Overview', icon: LayoutDashboard, route: 'overview' },
    { label: isTM ? 'WOs' : 'COs', icon: AlertTriangle, route: 'change-orders' },
    { label: 'Invoices', icon: Receipt, route: 'invoices' },
    { label: 'Orders', icon: Package, route: 'purchase-orders' },
  ];
}

interface MoreItem {
  label: string;
  icon: React.ElementType;
  route: string;
  featureKey?: string;
  hideForSupplier?: boolean;
}

interface MoreGroup {
  key: string;
  label: string;
  items: MoreItem[];
}

function getMoreGroups(isTM: boolean): MoreGroup[] {
  return [
    {
      key: 'pulse',
      label: 'Pulse',
      items: [
        { label: 'Project Info', icon: Settings2, route: 'setup' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      items: [
        ...(!isTM
          ? [{ label: 'Schedule of Values', icon: DollarSign, route: 'sov', featureKey: 'sov_contracts', hideForSupplier: true } as MoreItem]
          : []),
        { label: 'RFIs', icon: MessageSquareMore, route: 'rfis' },
        { label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
      ],
    },
    {
      key: 'money',
      label: 'Money',
      items: [
        { label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
        { label: 'Backcharges', icon: AlertTriangle, route: 'backcharges' },
        { label: 'Payment Apps', icon: FileText, route: 'payment-apps', hideForSupplier: true },
      ],
    },
    {
      key: 'field',
      label: 'Field',
      items: [
        { label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt', hideForSupplier: true },
        { label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs', hideForSupplier: true },
      ],
    },
    {
      key: 'docs',
      label: 'Docs',
      items: [
        { label: 'Project Settings', icon: Settings2, route: 'settings' },
      ],
    },
  ];
}

const UTILITY_ITEMS: { label: string; icon: React.ElementType; path: string }[] = [
  { label: 'My Team', icon: Users, path: '/org/team' },
  { label: 'Partners', icon: Handshake, path: '/partners' },
  { label: 'Reminders', icon: Bell, path: '/reminders' },
  { label: 'Settings', icon: Settings, path: '/settings' },
  { label: 'Profile', icon: User, path: '/profile' },
];

function MoreItemRow({
  item,
  isActive,
  onNavigate,
}: {
  item: MoreItem;
  isActive: boolean;
  onNavigate: (route: string) => void;
}) {
  const enabled = useFeatureEnabled((item.featureKey as any) ?? '__always_on__');
  if (item.featureKey && !enabled) return null;
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.route)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] w-full text-left',
        isActive ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted/30'
      )}
    >
      <Icon className="w-5 h-5" />
      {item.label}
    </button>
  );
}

interface ProjectBottomNavProps {
  isSupplier?: boolean;
  isTM?: boolean;
}

export function ProjectBottomNav({ isSupplier = false, isTM = false }: ProjectBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  const groups = getMoreGroups(isTM);
  const moreIsActive = groups.some((g) => g.items.some((i) => i.route === activeSection));

  const handleNavigateRoute = (route: string) => {
    navigate(`/project/${id}/${route}`);
    setMoreOpen(false);
  };

  const handleNavigatePath = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  if (!id) return null;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border"
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around h-[56px]">
          {getPrimaryItems(isTM).map((item) => {
            const active = activeSection === item.route;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigateRoute(item.route)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[56px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More sections"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[56px]',
              moreIsActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">More sections</DrawerTitle>
          <div className="flex flex-col gap-3 p-4 pb-8 overflow-y-auto">
            {groups.map((group) => {
              const visible = group.items.filter((i) => !(i.hideForSupplier && isSupplier));
              if (visible.length === 0) return null;
              return (
                <div key={group.key} className="flex flex-col gap-0.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 pt-1 pb-1">
                    {group.label}
                  </div>
                  {visible.map((item) => (
                    <MoreItemRow
                      key={item.route}
                      item={item}
                      isActive={activeSection === item.route}
                      onNavigate={handleNavigateRoute}
                    />
                  ))}
                </div>
              );
            })}

            <div className="h-px bg-border my-1" />
            <div className="flex flex-col gap-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 pt-1 pb-1">
                Account
              </div>
              {UTILITY_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigatePath(item.path)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] w-full text-left',
                      isActive ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted/30'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] w-full text-left text-foreground hover:bg-muted/30"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
