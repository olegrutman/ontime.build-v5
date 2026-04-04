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

export function DashboardBusinessSnapshot({ statusCounts, attentionCount, billing, pendingCOCount = 0, openPOCount = 0 }: DashboardBusinessSnapshotProps) {
  const totalActive = statusCounts.active + statusCounts.setup;
  const riskCount = attentionCount > 2 ? attentionCount : 0;
  const watchCount = attentionCount > 0 && attentionCount <= 2 ? attentionCount : 0;
  const healthyCount = Math.max(0, totalActive - riskCount - watchCount);

  const stats = [
    { label: 'Unapproved invoices', value: billing.invoicesReceived },
    { label: 'Pending COs', value: pendingCOCount },
    { label: 'Open POs', value: openPOCount },
  ];

  return (
    <div className="rounded-2xl bg-slate-950 text-white p-5">
      <p className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium">Business snapshot</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{totalActive} Active Projects</p>
      <p className="mt-1.5 text-[0.8rem] text-slate-400">
        {riskCount > 0 && `${riskCount} at risk · `}
        {watchCount > 0 && `${watchCount} watch · `}
        {healthyCount > 0 && `${healthyCount} healthy`}
      </p>
      <div className="mt-5 space-y-2.5 text-[0.85rem]">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-slate-400">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
