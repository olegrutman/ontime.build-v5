import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationSheet } from '@/components/notifications';

interface MobileProjectHeaderProps {
  projectName: string;
  projectStatus: string;
  onStatusChange?: (status: string) => void;
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

export function MobileProjectHeader({
  projectName,
  projectStatus,
  onStatusChange,
}: MobileProjectHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-3 h-12">
        {/* Project name */}
        <h1 className="flex-1 text-sm font-semibold truncate min-w-0">
          {projectName}
        </h1>

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 shrink-0">
              <Badge className={`${STATUS_COLORS[projectStatus]} text-[10px] px-1.5 py-0 pointer-events-none`}>
                {STATUS_LABELS[projectStatus] || projectStatus}
              </Badge>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
    </header>
  );
}
