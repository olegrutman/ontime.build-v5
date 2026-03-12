import { useMemo } from 'react';

interface DashboardWelcomeProps {
  firstName: string | null;
  attentionCount: number;
  activeProjects: number;
}

export function DashboardWelcome({ firstName, attentionCount, activeProjects }: DashboardWelcomeProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const name = firstName || 'there';

  const contextLine = attentionCount > 0
    ? `You have ${attentionCount} item${attentionCount > 1 ? 's' : ''} that need${attentionCount === 1 ? 's' : ''} your attention.`
    : activeProjects > 0
      ? `All caught up across ${activeProjects} active project${activeProjects > 1 ? 's' : ''}.`
      : 'Welcome to your dashboard.';

  return (
    <div className="pt-1 pb-0">
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
    </div>
  );
}
