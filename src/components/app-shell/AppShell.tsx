import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ContextBar } from './ContextBar';
import { CommandPalette } from './CommandPalette';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
  fullWidth?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  showNewButton,
  onNewClick,
  newButtonLabel,
  fullWidth,
}: AppShellProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();

  // Global ⌘K toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Build breadcrumbs from title + route
  const breadcrumbs: { label: string; onClick?: () => void }[] = [
    { label: 'Home', onClick: () => window.location.assign('/dashboard') },
  ];

  if (title && title !== 'Dashboard') {
    breadcrumbs.push({ label: title });
  } else if (title === 'Dashboard') {
    breadcrumbs[0] = { label: 'Dashboard' };
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop only */}
      <DashboardSidebar />

      <div className="flex flex-col flex-1 lg:ml-[200px] xl:ml-[220px]">
        <ContextBar
          breadcrumbs={breadcrumbs}
          onCommandPalette={() => setCmdOpen(true)}
          showNewButton={showNewButton}
          onNewClick={onNewClick}
          newButtonLabel={newButtonLabel}
        />

        {/* Page title band — mobile only */}
        {title && (
          <div className="pt-[52px] px-4 pb-0 lg:hidden">
            <div className="pt-3 pb-2">
              <h1 className="font-heading text-[1.4rem] font-black text-foreground leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[0.72rem] text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-auto ${title ? 'lg:pt-[52px]' : 'pt-[52px]'}`}>
          <div className={cn("w-full py-4 sm:py-6 pb-24 lg:pb-6", fullWidth ? "px-0" : "max-w-7xl mx-auto px-3 sm:px-5 md:px-6")}>
            {children}
          </div>
        </main>

        <MobileBottomNav />
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </div>
  );
}
