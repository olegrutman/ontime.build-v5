import { AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface ProjectHealthBannerProps {
  financials: ProjectFinancials;
  projectStatus: string;
}

export function ProjectHealthBanner({ financials, projectStatus }: ProjectHealthBannerProps) {
  const reasons: string[] = [];
  const { viewerRole, isTCMaterialResponsible, isGCMaterialResponsible } = financials;
  const showMaterials = isGCMaterialResponsible || isTCMaterialResponsible;

  // Material variance check
  if (showMaterials && financials.materialEstimateTotal && financials.materialOrdered > financials.materialEstimateTotal) {
    reasons.push('Materials forecast over estimate');
  }

  // Check outstanding billing
  if (financials.outstanding > 0 && financials.billedToDate > 0) {
    const pct = (financials.outstanding / financials.billedToDate) * 100;
    if (pct > 50) reasons.push('High outstanding balance');
  }

  const isRisk = reasons.length >= 2;
  const isWatch = reasons.length === 1;
  const isHealthy = reasons.length === 0;

  const label = isRisk ? 'At Risk' : isWatch ? 'Watch' : 'Healthy';
  const Icon = isRisk ? AlertTriangle : isWatch ? Activity : CheckCircle2;
  const colorClass = isRisk
    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40'
    : isWatch
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
    : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40';
  const iconColor = isRisk ? 'text-red-600 dark:text-red-400' : isWatch ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

  if (projectStatus !== 'active') return null;

  return (
    <div className={cn('rounded-xl border p-3 sm:p-4 flex items-start gap-3', colorClass)}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} />
      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', iconColor)}>{label}</p>
        {reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
