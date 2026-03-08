import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Handshake,
  Boxes,
  Settings,
  LogOut,
  ChevronDown,
  FileText,
  Users,
  Bell,
  MessageSquareMore,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NavLink } from '@/components/NavLink';
import { usePendingJoinRequests } from '@/hooks/usePendingJoinRequests';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABELS } from '@/types/organization';
import { cn } from '@/lib/utils';
import { OntimeLogo } from '@/components/ui/OntimeLogo';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'RFIs', url: '/rfis', icon: MessageSquareMore },
  { title: 'Reminders', url: '/reminders', icon: Bell },
  { title: 'Partners', url: '/partners', icon: Handshake },
];

// Supplier-only nav items
const supplierNavItems = [
  { title: 'My Inventory', url: '/supplier/inventory', icon: Boxes },
  { title: 'My Estimates', url: '/supplier/estimates', icon: FileText },
];



export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, userOrgRoles, currentRole, permissions, isAdmin, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const currentOrg = userOrgRoles.length > 0 ? userOrgRoles[0].organization : null;
  const orgId = currentOrg?.id;
  const isSupplier = currentOrg?.type === 'SUPPLIER';
  const isGC = currentRole === 'GC_PM';
  const canManageOrg = permissions?.canManageOrg ?? false;
  const pendingJoinCount = usePendingJoinRequests(isAdmin ? orgId : undefined);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;
  const isInGroup = (items: typeof mainNavItems) =>
    items.some((item) => location.pathname.startsWith(item.url));

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border hidden lg:flex">
      {/* Header / Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <OntimeLogo className="w-9 h-9 shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <h1 className="font-bold text-base tracking-tight text-sidebar-foreground truncate">
                OnTime.Build
              </h1>
              {currentOrg && (
                <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest truncate">
                  {currentOrg.org_code}
                </p>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems
              .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="gap-3"
                      activeClassName="nav-active"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {canManageOrg && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/org/team')}
                    tooltip={collapsed ? 'My Team' : undefined}
                  >
                    <NavLink
                      to="/org/team"
                      className="gap-3"
                      activeClassName="nav-active"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1">My Team</span>
                      )}
                      {!collapsed && pendingJoinCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                          {pendingJoinCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Supplier Section - Only for Supplier orgs */}
        {isSupplier && (
          <SidebarGroup>
            <Collapsible defaultOpen={isInGroup(supplierNavItems)} className="group/collapsible">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 justify-between">
                  {!collapsed && (
                    <>
                      <span>My Business</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </>
                  )}
                  {collapsed && <Boxes className="h-4 w-4 mx-auto" />}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {supplierNavItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={collapsed ? item.title : undefined}
                        >
                          <NavLink
                            to={item.url}
                            className="gap-3"
                            activeClassName="nav-active"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/profile')}
              className={cn(
                'h-auto py-2',
                collapsed ? 'justify-center' : 'justify-start gap-3'
              )}
              tooltip={collapsed ? profile?.full_name || 'User' : undefined}
            >
              <NavLink to="/profile" className="gap-3" activeClassName="nav-active">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {profile?.full_name || 'User'}
                    </p>
                    {currentRole && (
                      <p className="text-xs text-sidebar-foreground/60 truncate">
                        {isAdmin ? 'Owner' : ROLE_LABELS[currentRole]}
                      </p>
                    )}
                  </div>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/settings')}
              tooltip={collapsed ? 'Settings' : undefined}
            >
              <NavLink to="/settings" className="gap-3" activeClassName="nav-active">
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={collapsed ? 'Sign out' : undefined}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
