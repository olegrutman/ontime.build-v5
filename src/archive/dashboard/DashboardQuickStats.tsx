// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardQuickStatsProps {
  openWorkOrders: number;
  pendingInvoices: number;
  remindersDue: number;
}

export function DashboardQuickStats({ openWorkOrders, pendingInvoices, remindersDue }: DashboardQuickStatsProps) {
  const navigate = useNavigate();

  const tiles = [
    {
      label: 'Open Work Orders',
      count: openWorkOrders,
      icon: ClipboardList,
      onClick: () => navigate('/dashboard'),
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Pending Invoices',
      count: pendingInvoices,
      icon: FileText,
      onClick: () => navigate('/dashboard'),
      accent: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Reminders Due',
      count: remindersDue,
      icon: Bell,
      onClick: () => navigate('/reminders'),
      accent: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
    },
  ];

  const visibleTiles = tiles.filter((t) => t.count > 0);

  if (visibleTiles.length === 0) return null;

  const gridCols = visibleTiles.length === 1
    ? 'grid-cols-1'
    : visibleTiles.length === 2
    ? 'grid-cols-2'
    : 'grid-cols-3';

  return (
    <div className={cn('grid gap-2 sm:gap-3', gridCols)}>
      {visibleTiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.label}
            data-sasha-card="Quick Stat"
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={tile.onClick}
          >
            <CardContent className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4">
              <div className={`rounded-xl p-1.5 sm:p-2.5 hidden sm:block ${tile.bg}`}>
                <Icon className={`h-5 w-5 ${tile.accent}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold leading-none">{tile.count}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{tile.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
