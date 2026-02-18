import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  DollarSign,
  Handshake,
  Users,
  Bell,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  FileText,
  ShoppingCart,
  MessageSquareMore,
  MoreHorizontal,
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
  const { permissions } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const canManageOrg = permissions?.canManageOrg ?? false;

  const isProjectPage = location.pathname.startsWith('/project/');
  const projectId = isProjectPage ? location.pathname.split('/')[2] : null;
  const activeTab = searchParams.get('tab') || 'overview';

  const dashboardItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Financials', icon: DollarSign, path: '/financials' },
    { label: 'Partners', icon: Handshake, path: '/partners' },
    ...(canManageOrg ? [{ label: 'My Team', icon: Users, path: '/org/team' }] : []),
    { label: 'Reminders', icon: Bell, path: '/reminders' },
  ];

  const primaryProjectItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
    { label: 'WOs', icon: ClipboardList, tab: 'work-orders' },
  ];

  const moreProjectItems: NavItem[] = [
    { label: 'SOV', icon: ListChecks, tab: 'sov' },
    { label: 'Invoices', icon: FileText, tab: 'invoices' },
    { label: 'POs', icon: ShoppingCart, tab: 'purchase-orders' },
    { label: 'RFIs', icon: MessageSquareMore, tab: 'rfis' },
  ];

  const items = isProjectPage ? primaryProjectItems : dashboardItems;
  const moreIsActive = isProjectPage && moreProjectItems.some(i => i.tab === activeTab);

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
          {isProjectPage && (
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
          )}
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">More options</DrawerTitle>
          <div className="flex flex-col gap-1 p-4 pb-8">
            {moreProjectItems.map((item) => {
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
