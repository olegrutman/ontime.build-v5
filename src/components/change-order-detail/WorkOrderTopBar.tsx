import { useNavigate } from 'react-router-dom';
import { User, Users, Settings, LogOut } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationSheet } from '@/components/notifications';
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge';
import { ChangeOrderStatus } from '@/types/changeOrderProject';
import { useAuth } from '@/hooks/useAuth';

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
  const { profile, currentRole, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleTabClick = (tab: string) => {
    if (tab === 'work-orders' || tab === 'overview') {
      navigate(`/project/${projectId}?tab=${tab}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card backdrop-blur">
      {/* Top row: sidebar trigger, project name, WO title, status, notifications */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 h-14">
        <SidebarTrigger className="-ml-1 hidden lg:flex" />
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

        {/* Mobile profile avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/org/team')}>
                  <Users className="mr-2 h-4 w-4" />
                  My Team
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom row: Navigation tabs - hidden on mobile/tablet */}
      <div className="relative pb-2 hidden lg:block">
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
