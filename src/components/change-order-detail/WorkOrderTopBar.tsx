import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSheet } from '@/components/notifications';
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge';
import { ChangeOrderStatus } from '@/types/changeOrderProject';

interface WorkOrderTopBarProps {
  projectName: string;
  projectId: string;
  workOrderTitle: string;
  status: ChangeOrderStatus;
}

export function WorkOrderTopBar({
  projectName,
  projectId,
  workOrderTitle,
  status,
}: WorkOrderTopBarProps) {
  const navigate = useNavigate();

  const handleTabClick = (tab: string) => {
    if (tab === 'work-orders' || tab === 'overview') {
      navigate(`/project/${projectId}?tab=${tab}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      {/* Top row: sidebar trigger, project name, WO title, status, notifications */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 h-14">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Breadcrumb: Project > WO Title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate hidden sm:inline"
          >
            {projectName}
          </button>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-lg font-semibold truncate">
            {workOrderTitle}
          </h1>
        </div>

        {/* Status badge */}
        <ChangeOrderStatusBadge status={status} />

        {/* Notifications */}
        <NotificationSheet />
      </div>

      {/* Bottom row: Navigation tabs */}
      <div className="relative pb-2">
        <Tabs value="detail">
          <div className="overflow-x-auto px-3 sm:px-4">
            <TabsList className="h-11 w-max justify-start bg-transparent p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                onClick={() => handleTabClick('overview')}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="work-orders"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap"
                onClick={() => handleTabClick('work-orders')}
              >
                Work Orders
              </TabsTrigger>
              <TabsTrigger
                value="detail"
                className="h-10 px-4 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md whitespace-nowrap pointer-events-none"
              >
                Details
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </header>
  );
}
