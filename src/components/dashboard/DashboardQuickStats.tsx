import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
      onClick: () => navigate('/change-orders'),
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Pending Invoices',
      count: pendingInvoices,
      icon: FileText,
      onClick: () => navigate('/financials'),
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

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={tile.onClick}
          >
            <CardContent className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4">
              <div className={`rounded-lg p-1.5 sm:p-2.5 hidden sm:block ${tile.bg}`}>
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
