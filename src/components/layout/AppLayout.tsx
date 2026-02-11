import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

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
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <TopBar
            title={title}
            subtitle={subtitle}
            showNewButton={showNewButton}
            onNewClick={onNewClick}
            newButtonLabel={newButtonLabel}
          />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
