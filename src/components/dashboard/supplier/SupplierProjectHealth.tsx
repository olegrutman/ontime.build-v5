import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import type { ProjectHealthRow } from '@/hooks/useSupplierDashboardData';

function PaceBadge({ avgDays }: { avgDays: number | null }) {
  if (avgDays == null) return <span className="text-[0.6rem] text-muted-foreground">—</span>;
  const label = avgDays <= 7 ? 'Fast' : avgDays <= 21 ? 'Normal' : 'Slow';
  const color = avgDays <= 7
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : avgDays <= 21
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${color}`}>
      {label} ({avgDays}d)
    </span>
  );
}

interface Props { rows: ProjectHealthRow[]; }

export function SupplierProjectHealth({ rows }: Props) {
  const navigate = useNavigate();
  const totalExposure = rows.reduce((s, r) => s + r.exposure, 0);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Project Health
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">
          Credit exposure by project
        </p>
      </div>

      <div className="p-3 space-y-1.5">
        {rows.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[0.78rem] text-muted-foreground">No delivery data yet</p>
          </div>
        ) : (
          rows.slice(0, 6).map(row => (
            <button
              key={row.projectId}
              onClick={() => navigate(`/project/${row.projectId}`)}
              className="w-full text-left border border-border rounded-md px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[0.78rem] font-semibold text-foreground truncate">{row.projectName}</div>
                  <div className="text-[0.65rem] text-muted-foreground truncate">{row.gcName}</div>
                </div>
                <PaceBadge avgDays={row.avgApprovalDays} />
              </div>
              <div className="flex items-center gap-3 text-[0.68rem]">
                <span className="text-muted-foreground">
                  Delivered: <span className="font-semibold text-foreground">{formatCurrency(row.deliveredTotal)}</span>
                </span>
                <span className="text-muted-foreground">
                  Approved: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.approvedTotal)}</span>
                </span>
                {row.exposure > 0 && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    At risk: {formatCurrency(row.exposure)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalExposure > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[0.72rem] font-medium text-muted-foreground">Total Exposure</span>
            <span className="font-heading text-[1.1rem] font-black text-red-600 dark:text-red-400">
              {formatCurrency(totalExposure)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
