import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';

interface Tab {
  key: string;
  label: string;
  featureKey?: string;
}

const TABS: Tab[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'change-orders', label: 'Change Orders', featureKey: 'change_orders' },
  { key: 'invoices', label: 'Invoices', featureKey: 'invoicing' },
  { key: 'purchase-orders', label: 'Purchase Orders', featureKey: 'purchase_orders' },
  { key: 'returns', label: 'Returns', featureKey: 'returns_tracking' },
  { key: 'schedule', label: 'Schedule', featureKey: 'schedule_gantt' },
  { key: 'daily-log', label: 'Daily Log', featureKey: 'daily_logs' },
];

interface ProjectTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSupplier?: boolean;
}

function TabItem({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  if (!tab.featureKey) {
    return (
      <button
        onClick={onClick}
        className={cn(
        'whitespace-nowrap px-1 pb-2.5 pt-2.5 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
        )}
      >
        {tab.label}
      </button>
    );
  }
  return <FeatureTabItem tab={tab} active={active} onClick={onClick} />;
}

function FeatureTabItem({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  const enabled = useFeatureEnabled(tab.featureKey as any);
  if (!enabled) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap px-1 pb-2.5 pt-2.5 text-sm font-medium border-b-2 transition-colors min-h-[44px]',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      {tab.label}
    </button>
  );
}

export function ProjectTabBar({ activeTab, onTabChange, isSupplier }: ProjectTabBarProps) {
  return (
    <div className="lg:hidden bg-background border-b border-border px-3 sm:px-6 relative">
      {/* Scroll fade indicators */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
      <nav className="flex gap-5 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
      </nav>
    </div>
  );
}
