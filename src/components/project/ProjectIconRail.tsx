import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  
  DollarSign,
  AlertTriangle,
  MessageSquareMore,
  FileText,
  Receipt,
  Package,
  RotateCcw,
  CalendarDays,
  PenLine,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';

interface RailItem {
  key: string;
  label: string;
  icon: React.ElementType;
  route: string;
  featureKey?: string;
  hideForSupplier?: boolean;
}

const GROUP_1: RailItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, route: 'overview' },
  { key: 'setup', label: 'Project Info', icon: Settings2, route: 'setup' },
];

const GROUP_2: RailItem[] = [
  { key: 'change-orders', label: 'Change Orders', icon: AlertTriangle, route: 'change-orders', featureKey: 'change_orders' },
  { key: 'rfis', label: 'RFIs', icon: MessageSquareMore, route: 'rfis' },
  { key: 'estimates', label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
];

const GROUP_3: RailItem[] = [
  { key: 'invoices', label: 'Invoices', icon: Receipt, route: 'invoices', featureKey: 'invoicing' },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: Package, route: 'purchase-orders', featureKey: 'purchase_orders' },
  { key: 'returns', label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
];

const GROUP_4: RailItem[] = [
  { key: 'schedule', label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt' },
  { key: 'daily-log', label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs' },
];

const ALL_GROUPS = [GROUP_1, GROUP_2, GROUP_3, GROUP_4];

function useFeatureCheck(featureKey?: string) {
  return useFeatureEnabled(featureKey as any ?? '__always_on__');
}

function RailIcon({
  item,
  isActive,
  showTooltipExpanded,
  projectId,
}: {
  item: RailItem;
  isActive: boolean;
  showTooltipExpanded: boolean;
  projectId: string;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const Icon = item.icon;

  useEffect(() => {
    if (hovered) {
      timerRef.current = setTimeout(() => setShowTooltip(true), 150);
    } else {
      clearTimeout(timerRef.current);
      setShowTooltip(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [hovered]);

  const tooltipVisible = showTooltipExpanded || showTooltip;

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={() => navigate(`/project/${projectId}/${item.route}`)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          isActive && 'bg-primary',
          !isActive && hovered && 'bg-muted/50',
        )}
        aria-label={item.label}
      >
        <Icon
          className={cn(
            'w-[15px] h-[15px]',
            isActive ? 'text-primary-foreground' : hovered ? 'text-foreground' : 'text-muted-foreground'
          )}
          strokeWidth={1.8}
        />
      </button>
      {/* Tooltip */}
      {tooltipVisible && (
        <div className="absolute left-full ml-2 z-50 whitespace-nowrap pointer-events-none bg-foreground text-background text-[10px] px-2 py-1 rounded">
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1"
            style={{
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight: '4px solid hsl(var(--foreground))',
            }}
          />
          {item.label}
        </div>
      )}
    </div>
  );
}

function FilteredRailItem({
  item,
  isActive,
  showTooltipExpanded,
  projectId,
  isSupplier,
}: {
  item: RailItem;
  isActive: boolean;
  showTooltipExpanded: boolean;
  projectId: string;
  isSupplier: boolean;
}) {
  const enabled = useFeatureCheck(item.featureKey);
  if (item.featureKey && !enabled) return null;
  if (item.hideForSupplier && isSupplier) return null;
  return (
    <RailIcon
      item={item}
      isActive={isActive}
      showTooltipExpanded={showTooltipExpanded}
      projectId={projectId}
    />
  );
}

interface ProjectIconRailProps {
  isSupplier?: boolean;
}

export function ProjectIconRail({ isSupplier = false }: ProjectIconRailProps) {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [showExpanded, setShowExpanded] = useState(false);

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  useEffect(() => {
    const key = 'project-rail-onboarded';
    if (!localStorage.getItem(key)) {
      setShowExpanded(true);
      const timer = setTimeout(() => {
        setShowExpanded(false);
        localStorage.setItem(key, '1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!id) return null;

  return (
    <div className="hidden md:flex flex-col items-center py-3 gap-1.5 flex-shrink-0 w-[44px] bg-muted/30 border-r border-border">
      {ALL_GROUPS.map((group, gi) => {
        const items = group.filter(item => {
          if (item.hideForSupplier && isSupplier) return false;
          return true;
        });
        if (items.length === 0) return null;
        return (
          <div key={gi}>
            {gi > 0 && (
              <div className="flex justify-center my-1">
                <div className="w-[26px] h-px bg-border" />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              {group.map((item) => (
                <FilteredRailItem
                  key={item.key}
                  item={item}
                  isActive={activeSection === item.route}
                  showTooltipExpanded={showExpanded}
                  projectId={id}
                  isSupplier={isSupplier}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
