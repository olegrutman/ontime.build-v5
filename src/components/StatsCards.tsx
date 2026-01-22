import { WorkItem, WorkItemState, WorkItemType } from '@/types/workItem';
import { Card } from '@/components/ui/card';
import { DollarSign, Layers, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface StatsCardsProps {
  items: WorkItem[];
}

export function StatsCards({ items }: StatsCardsProps) {
  const totalValue = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const byState = items.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {} as Record<WorkItemState, number>);

  const changeOrders = items.filter(i => i.type === 'CHANGE_WORK');
  const changeOrderValue = changeOrders.reduce((sum, item) => sum + (item.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  const stats = [
    {
      label: 'Total Contract Value',
      value: formatCurrency(totalValue),
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-type-project',
      bgColor: 'bg-type-project/10',
    },
    {
      label: 'Work Items',
      value: items.length.toString(),
      icon: <Layers className="w-5 h-5" />,
      color: 'text-type-sov',
      bgColor: 'bg-type-sov/10',
    },
    {
      label: 'Open Items',
      value: (byState.OPEN || 0).toString(),
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-state-open',
      bgColor: 'bg-state-open-bg',
    },
    {
      label: 'Approved',
      value: (byState.APPROVED || 0).toString(),
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-state-approved',
      bgColor: 'bg-state-approved-bg',
    },
    {
      label: 'Change Orders',
      value: changeOrders.length.toString(),
      subValue: formatCurrency(changeOrderValue),
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-type-change',
      bgColor: 'bg-type-change/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.subValue && (
                <p className="text-sm text-muted-foreground">{stat.subValue}</p>
              )}
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
              {stat.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
