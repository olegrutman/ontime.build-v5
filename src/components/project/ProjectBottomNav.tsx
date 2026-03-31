import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Receipt,
  Package,
  Menu,
  ClipboardList,
  DollarSign,
  MessageSquareMore,
  FileText,
  RotateCcw,
  CalendarDays,
  PenLine,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { FieldCaptureSheet } from '@/components/field-capture/FieldCaptureSheet';
import { useAuth } from '@/hooks/useAuth';

interface BottomItem {
  label: string;
  icon: React.ElementType;
  route: string;
}

const PRIMARY_ITEMS: BottomItem[] = [
  { label: 'Overview', icon: LayoutDashboard, route: 'overview' },
  { label: 'COs', icon: AlertTriangle, route: 'change-orders' },
  { label: 'Invoices', icon: Receipt, route: 'invoices' },
  { label: 'Orders', icon: Package, route: 'purchase-orders' },
];

interface MoreItem {
  label: string;
  icon: React.ElementType;
  route: string;
  featureKey?: string;
  hideForSupplier?: boolean;
}

const MORE_ITEMS: MoreItem[] = [
  { label: 'Framing Scope', icon: ClipboardList, route: 'scope' },
  { label: 'SOV', icon: DollarSign, route: 'sov', featureKey: 'sov_contracts', hideForSupplier: true },
  { label: 'RFIs', icon: MessageSquareMore, route: 'rfis' },
  { label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
  { label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
  { label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt' },
  { label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs' },
];

function MoreItemRow({ item, isActive, onNavigate }: { item: MoreItem; isActive: boolean; onNavigate: (route: string) => void }) {
  const enabled = useFeatureEnabled(item.featureKey as any ?? '__always_on__');
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
}

export function ProjectBottomNav({ isSupplier = false }: ProjectBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [moreOpen, setMoreOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const { userOrgRoles } = useAuth();
  const fieldCaptureEnabled = useFeatureEnabled('field_capture');
  const orgId = userOrgRoles[0]?.organization_id;

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  const moreIsActive = MORE_ITEMS.some(i => i.route === activeSection);

  const handleNavigate = (route: string) => {
    navigate(`/project/${id}/${route}`);
    setMoreOpen(false);
  };

  if (!id) return null;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border"
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around h-[56px]">
          {PRIMARY_ITEMS.map((item) => {
            const active = activeSection === item.route;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.route)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[56px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </button>
            );
          })}
          {/* Capture FAB */}
          {fieldCaptureEnabled && (
            <button
              onClick={() => setCaptureOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors text-primary min-h-[56px]"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[8px] font-bold text-primary">Capture</span>
            </button>
          )}
          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[56px]',
              moreIsActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">More sections</DrawerTitle>
          <div className="flex flex-col gap-1 p-4 pb-8">
            {MORE_ITEMS.filter(i => !(i.hideForSupplier && isSupplier)).map((item) => (
              <MoreItemRow
                key={item.route}
                item={item}
                isActive={activeSection === item.route}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Field Capture Sheet */}
      {orgId && (
        <FieldCaptureSheet
          open={captureOpen}
          onOpenChange={setCaptureOpen}
          projectId={id}
          organizationId={orgId}
        />
      )}
    </>
  );
}
