import { ChevronDown } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSheet } from '@/components/notifications';

interface ProjectTopBarProps {
  projectName: string;
  projectStatus: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onStatusChange?: (status: string) => void;
  isSupplier?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'on_hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'archived': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  'draft': 'Draft',
  'active': 'Active',
  'on_hold': 'On Hold',
  'completed': 'Completed',
  'archived': 'Archived',
};

export function ProjectTopBar({
  projectName,
  projectStatus,
  activeTab,
  onTabChange,
  onStatusChange,
  isSupplier = false,
}: ProjectTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card backdrop-blur">
      {/* Top row: sidebar trigger, project name, status, notifications */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 h-14">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Project name - centered on mobile, left-aligned on desktop */}
        <div className="flex-1 flex items-center justify-center sm:justify-start min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">
            {projectName}
          </h1>
        </div>

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
              <Badge className={`${STATUS_COLORS[projectStatus]} pointer-events-none`}>
                {STATUS_LABELS[projectStatus] || projectStatus}
              </Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange?.(option.value)}
                className={projectStatus === option.value ? 'bg-muted' : ''}
              >
                <Badge className={`${STATUS_COLORS[option.value]} mr-2`}>
                  {option.label}
                </Badge>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationSheet />
      </div>

      {/* Bottom row: Navigation tabs - scrollable on mobile */}
      <div className="relative pb-2">
        <Tabs value={activeTab}>
          <div className="overflow-x-auto px-3 sm:px-4">
            <TabsList className="h-11 w-max justify-start bg-transparent p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                onClick={() => onTabChange('overview')}
              >
                Overview
              </TabsTrigger>
              {!isSupplier && (
                <TabsTrigger
                  value="sov"
                  className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                  onClick={() => onTabChange('sov')}
                >
                  SOV
                </TabsTrigger>
              )}
              {!isSupplier && (
                <TabsTrigger
                  value="work-orders"
                  className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                  onClick={() => onTabChange('work-orders')}
                >
                  Work Orders
                </TabsTrigger>
              )}
              {isSupplier && (
                <TabsTrigger
                  value="estimates"
                  className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                  onClick={() => onTabChange('estimates')}
                >
                  Estimates
                </TabsTrigger>
              )}
              <TabsTrigger
                value="invoices"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                onClick={() => onTabChange('invoices')}
              >
                Invoices
              </TabsTrigger>
              <TabsTrigger
                value="purchase-orders"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                onClick={() => onTabChange('purchase-orders')}
              >
                Purchase Orders
              </TabsTrigger>
              {!isSupplier && (
                <TabsTrigger
                  value="documents"
                  className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                  disabled
                  onClick={() => onTabChange('documents')}
                >
                  Documents
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </Tabs>
      </div>
    </header>
  );
}
