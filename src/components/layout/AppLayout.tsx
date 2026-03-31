import { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';

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
    <AppShell
      title={title}
      subtitle={subtitle}
      showNewButton={showNewButton}
      onNewClick={onNewClick}
      newButtonLabel={newButtonLabel}
    >
      {children}
    </AppShell>
  );
}
