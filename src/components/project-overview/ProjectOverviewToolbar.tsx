import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationSheet } from '@/components/notifications';
import { cn } from '@/lib/utils';

interface ProjectOverviewToolbarProps {
  projectName: string;
  status: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'on_hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'archived': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  'draft': 'Draft',
  'active': 'Active',
  'on_hold': 'On Hold',
  'completed': 'Completed',
  'archived': 'Archived',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'work-orders', label: 'Work Orders' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'schedule', label: 'Schedule', disabled: true },
  { id: 'documents', label: 'Documents', disabled: true },
];

export function ProjectOverviewToolbar({
  projectName,
  status,
  activeTab,
  onTabChange,
}: ProjectOverviewToolbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      {/* Top row: Project name + status */}
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold truncate">{projectName}</h1>
          <Badge className={cn('shrink-0', STATUS_COLORS[status] || STATUS_COLORS.draft)}>
            {STATUS_LABELS[status] || status}
          </Badge>
        </div>

        <NotificationSheet />
      </div>

      {/* Navigation tabs row */}
      <div className="flex items-center gap-1 px-3 sm:px-4 pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-3 text-sm font-medium shrink-0',
              activeTab === tab.id && 'bg-secondary',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
          >
            {tab.label}
            {tab.disabled && (
              <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>
            )}
          </Button>
        ))}
      </div>
    </header>
  );
}
