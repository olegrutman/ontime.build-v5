import { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
  onNewClick?: () => void;
  newButtonLabel?: string;
  fullWidth?: boolean;
}

export function AppLayout({
  children,
  title,
  subtitle,
  showNewButton,
  onNewClick,
  newButtonLabel,
  fullWidth,
}: AppLayoutProps) {
  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      showNewButton={showNewButton}
      onNewClick={onNewClick}
      newButtonLabel={newButtonLabel}
      fullWidth={fullWidth}
    >
      {children}
    </AppShell>
  );
}
