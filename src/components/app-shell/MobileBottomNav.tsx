import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Handshake, Bell, MessageSquareMore, MoreHorizontal, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const canManageOrg = permissions?.canManageOrg ?? false;

  // On project pages, ProjectBottomNav handles mobile nav
  const isProjectPage = location.pathname.startsWith('/project/');
  if (isProjectPage) return null;

  const primaryItems: NavItem[] = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Partners', icon: Handshake, path: '/partners' },
    { label: 'Reminders', icon: Bell, path: '/reminders' },
    { label: 'RFIs', icon: MessageSquareMore, path: '/rfis' },
  ];

  const moreItems: NavItem[] = [
    ...(canManageOrg ? [{ label: 'My Team', icon: Users, path: '/org/team' }] : []),
  ];

  const moreIsActive = moreItems.some((i) => i.path === location.pathname);

  const isActive = (item: NavItem) => item.path ? location.pathname === item.path : false;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border"
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around h-[58px]">
          {primaryItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[58px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors min-h-[58px]',
                moreIsActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          )}
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">More options</DrawerTitle>
          <div className="flex flex-col gap-1 p-4 pb-8">
            {moreItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                    active ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted/30'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
