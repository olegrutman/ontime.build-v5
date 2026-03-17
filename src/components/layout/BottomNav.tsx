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
  CalendarDays,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { FieldCaptureSheet } from '@/components/field-capture/FieldCaptureSheet';

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
  const [captureOpen, setCaptureOpen] = useState(false);

  const canManageOrg = permissions?.canManageOrg ?? false;
  const isSupplier = userOrgRoles[0]?.organization?.type === 'SUPPLIER';

  const isProjectPage = location.pathname.startsWith('/project/');
  const projectId = isProjectPage ? location.pathname.split('/')[2] : null;
  const activeTab = searchParams.get('tab') || 'overview';

  // Feature access checks
  const sovEnabled = useFeatureEnabled('sov_contracts');
  const changeOrdersEnabled = useFeatureEnabled('change_orders');
  const scheduleEnabled = useFeatureEnabled('schedule_gantt');
  const dailyLogEnabled = useFeatureEnabled('daily_logs');
  const invoicingEnabled = useFeatureEnabled('invoicing');
  const posEnabled = useFeatureEnabled('purchase_orders');
  const returnsEnabled = useFeatureEnabled('returns_tracking');
  const fieldCaptureEnabled = useFeatureEnabled('field_capture');
  const orgId = userOrgRoles[0]?.organization_id;

  const dashboardPrimaryItems: NavItem[] = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Partners', icon: Handshake, path: '/partners' },
    { label: 'Reminders', icon: Bell, path: '/reminders' },
    { label: 'RFIs', icon: MessageSquareMore, path: '/rfis' },
  ];

  const dashboardMoreItems: NavItem[] = [
    ...(canManageOrg ? [{ label: 'My Team', icon: Users, path: '/org/team' }] : []),
  ];

  const primaryProjectItems: NavItem[] = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
    ...(!isSupplier && changeOrdersEnabled ? [{ label: 'WOs', icon: ClipboardList, tab: 'work-orders' }] : []),
    ...(changeOrdersEnabled ? [{ label: 'COs', icon: FileText, tab: 'change-orders' }] : []),
  ];

  const moreProjectItems: NavItem[] = [
    ...(!isSupplier && sovEnabled ? [{ label: 'SOV', icon: ListChecks, tab: 'sov' }] : []),
    ...(scheduleEnabled ? [{ label: 'Schedule', icon: CalendarDays, tab: 'schedule' }] : []),
    ...(dailyLogEnabled ? [{ label: 'Daily Log', icon: ClipboardList, tab: 'daily-log' }] : []),
    ...(invoicingEnabled ? [{ label: 'Invoices', icon: FileText, tab: 'invoices' }] : []),
    ...(posEnabled ? [{ label: 'POs', icon: ShoppingCart, tab: 'purchase-orders' }] : []),
    ...(returnsEnabled ? [{ label: 'Returns', icon: Undo2, tab: 'returns' }] : []),
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
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          backgroundColor: 'hsl(216 56% 14%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-stretch justify-around" style={{ height: '58px' }}>
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
                style={{
                  color: active ? '#F5A623' : 'rgba(255,255,255,0.35)',
                  minHeight: '58px',
                }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </button>
            );
          })}
          {/* Capture FAB — only on project pages */}
          {isProjectPage && fieldCaptureEnabled && (
            <button
              onClick={() => setCaptureOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
              style={{ color: '#F5A623', minHeight: '58px' }}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold">Capture</span>
            </button>
          )}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
            style={{
              color: moreIsActive ? '#F5A623' : 'rgba(255,255,255,0.35)',
              minHeight: '58px',
            }}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[11px] font-semibold">More</span>
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
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
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

      {/* Field Capture Sheet */}
      {isProjectPage && projectId && orgId && (
        <FieldCaptureSheet
          open={captureOpen}
          onOpenChange={setCaptureOpen}
          projectId={projectId}
          organizationId={orgId}
        />
      )}
    </>
  );
}
