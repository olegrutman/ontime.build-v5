import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Handshake,
  LayoutDashboard,
  ListChecks,
  FileText,
  ShoppingCart,
  ClipboardList,
  MessageSquareMore,
  MoreHorizontal,
  Bell,
  Users,
  Undo2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  tab?: string;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { permissions, userOrgRoles } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const canManageOrg = permissions?.canManageOrg ?? false;
  const isSupplier = userOrgRoles[0]?.organization?.type === 'SUPPLIER';

  const isProjectPage = location.pathname.startsWith('/project/');
  const projectId = isProjectPage ? location.pathname.split('/')[2] : null;
  const activeTab = searchParams.get('tab') || 'overview';

  // 10. Updated dashboard items with global pages
  const dashboardPrimaryItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Partners', icon: Handshake, path: '/partners' },
    { label: 'Reminders', icon: Bell, path: '/reminders' },
    { label: 'RFIs', icon: MessageSquareMore, path: '/rfis' },
  ];

  const dashboardMoreItems: NavItem[] = [
    ...(canManageOrg ? [{ label: 'My Team', icon: Users, path: '/org/team' }] : []),
  ];

  const primaryProjectItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
    ...(!isSupplier ? [{ label: 'WOs', icon: ClipboardList, tab: 'work-orders' }] : []),
  ];

  const moreProjectItems: NavItem[] = [
    ...(!isSupplier ? [{ label: 'SOV', icon: ListChecks, tab: 'sov' }] : []),
    { label: 'Schedule', icon: CalendarDays, tab: 'schedule' },
    { label: 'Invoices', icon: FileText, tab: 'invoices' },
    { label: 'POs', icon: ShoppingCart, tab: 'purchase-orders' },
    { label: 'Returns', icon: Undo2, tab: 'returns' },
    { label: 'RFIs', icon: MessageSquareMore, tab: 'rfis' },
  ];

  const items = isProjectPage ? primaryProjectItems : dashboardPrimaryItems;
  const moreItems = isProjectPage ? moreProjectItems : dashboardMoreItems;
  const moreIsActive = isProjectPage
    ? moreProjectItems.some(i => i.tab === activeTab)
    : dashboardMoreItems.some(i => i.path === location.pathname);

  const isActive = (item: NavItem) => {
    if (item.path) return location.pathname === item.path;
    if (item.tab) return activeTab === item.tab;
    return false;
  };

  const handleClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.tab && projectId) {
      navigate(`/project/${projectId}?tab=${item.tab}`);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border">
        <div className="flex items-stretch justify-around h-16">
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          {/* More button — always shown */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] transition-colors',
              moreIsActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">More options</DrawerTitle>
          <div className="flex flex-col gap-1 p-4 pb-8">
            {moreItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    handleClick(item);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
