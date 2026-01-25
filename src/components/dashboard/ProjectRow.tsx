import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, MoreVertical, Archive, RotateCcw, PauseCircle, CheckCircle2, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface ProjectRowProps {
  project: {
    id: string;
    name: string;
    project_type: string;
    status: string;
    updated_at: string;
  };
  userRole: string | null;
  contractValue: number | null;
  pendingActions: number;
  onArchive: (projectId: string) => void;
  onUnarchive: (projectId: string) => void;
  onStatusChange: (projectId: string, status: 'active' | 'on_hold' | 'completed') => void;
}

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
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

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectRow({
  project,
  userRole,
  contractValue,
  pendingActions,
  onArchive,
  onUnarchive,
  onStatusChange,
}: ProjectRowProps) {
  const navigate = useNavigate();
  const isArchived = project.status === 'archived';
  const isOnHold = project.status === 'on_hold';
  const isCompleted = project.status === 'completed';
  const isActive = project.status === 'active';

  const handleRowClick = () => {
    navigate(`/project/${project.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className="hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Icon */}
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="capitalize truncate">{project.project_type}</span>
                  {userRole && (
                    <>
                      <span className="hidden xs:inline">•</span>
                      <span className="truncate hidden xs:inline">{userRole}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={handleMenuClick}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={handleMenuClick}>
                    {isArchived ? (
                      <DropdownMenuItem onClick={() => onUnarchive(project.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Unarchive Project
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {/* Status change options */}
                        {!isActive && (
                          <DropdownMenuItem onClick={() => onStatusChange(project.id, 'active')}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Set Active
                          </DropdownMenuItem>
                        )}
                        {!isOnHold && (
                          <DropdownMenuItem onClick={() => onStatusChange(project.id, 'on_hold')}>
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Set On Hold
                          </DropdownMenuItem>
                        )}
                        {!isCompleted && (
                          <DropdownMenuItem onClick={() => onStatusChange(project.id, 'completed')}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Set Completed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onArchive(project.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Project
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile row */}
            <div className="flex items-center gap-2 mt-2 sm:hidden">
              <Badge className={STATUS_COLORS[project.status] || STATUS_COLORS.draft}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              {pendingActions > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pendingActions} pending
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(project.updated_at), 'MMM d')}
              </span>
            </div>
          </div>

          {/* Desktop info */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {contractValue !== null && (
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(contractValue)}</p>
                <p className="text-xs text-muted-foreground">Contract</p>
              </div>
            )}
            <div className="text-right min-w-[100px]">
              <Badge className={STATUS_COLORS[project.status] || STATUS_COLORS.draft}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              {pendingActions > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">
                  {pendingActions}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(project.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
