interface DashboardBusinessSnapshotProps {
  statusCounts: {
    setup: number;
    active: number;
    on_hold: number;
    completed: number;
    archived: number;
  };
  attentionCount: number;
  billing: {
    invoicesReceived: number;
    outstandingToPay: number;
    outstandingToCollect: number;
  };
  pendingCOCount?: number;
  openPOCount?: number;
}

export function DashboardBusinessSnapshot({ statusCounts, attentionCount, billing }: DashboardBusinessSnapshotProps) {
  const totalActive = statusCounts.active + statusCounts.setup;
  const riskCount = attentionCount > 2 ? attentionCount : 0;
  const watchCount = attentionCount > 0 && attentionCount <= 2 ? attentionCount : 0;
  const healthyCount = Math.max(0, totalActive - riskCount - watchCount);

  const stats = [
    { label: 'Unapproved invoices', value: billing.invoicesReceived },
    { label: 'Pending COs', value: 0 },
    { label: 'Open POs', value: 0 },
  ];

  return (
    <div className="rounded-3xl bg-[hsl(var(--foreground))] text-white p-5 shadow-sm">
      <p className="text-sm text-slate-300">Business snapshot</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{totalActive} Active Projects</p>
      <p className="mt-2 text-sm text-slate-300">
        {riskCount > 0 && `${riskCount} at risk · `}
        {watchCount > 0 && `${watchCount} watch · `}
        {healthyCount > 0 && `${healthyCount} healthy`}
      </p>
      <div className="mt-6 space-y-3 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-slate-300">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
