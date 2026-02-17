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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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

  const projectItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
    { label: 'SOV', icon: ListChecks, tab: 'sov' },
    { label: 'WOs', icon: ClipboardList, tab: 'work-orders' },
    { label: 'Invoices', icon: FileText, tab: 'invoices' },
    { label: 'POs', icon: ShoppingCart, tab: 'purchase-orders' },
  ];

  const items = isProjectPage ? projectItems : dashboardItems;

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
      </div>
    </nav>
  );
}
