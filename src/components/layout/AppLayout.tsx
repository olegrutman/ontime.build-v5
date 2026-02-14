import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
}

export function AppLayout({
  children,
  title,
  subtitle,
  showNewButton,
  onNewClick,
  newButtonLabel,
}: AppLayoutProps) {
  const defaultOpen = useDefaultSidebarOpen();
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
         <SidebarInset className="flex flex-col flex-1 bg-background">
          <TopBar
            title={title}
            subtitle={subtitle}
            showNewButton={showNewButton}
            onNewClick={onNewClick}
            newButtonLabel={newButtonLabel}
          />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-5 md:px-6 py-4 sm:py-6 pb-20">
              {children}
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
