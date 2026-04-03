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
    const pct = Math.round(((financials.materialOrdered - financials.materialEstimateTotal) / financials.materialEstimateTotal) * 100);
    reasons.push(`Material forecast is ${pct}% over estimate`);
  }

  // Check outstanding billing
  if (financials.outstanding > 0 && financials.billedToDate > 0) {
    const pct = (financials.outstanding / financials.billedToDate) * 100;
    if (pct > 50) reasons.push('High outstanding balance');
  }

  // Check pending delivery
  if (financials.materialOrderedPending > 0) {
    reasons.push('1 delivery still unconfirmed for next 5 days');
  }

  const isRisk = reasons.length >= 2;
  const isWatch = reasons.length === 1;

  const label = isRisk ? 'Project health is at risk' : isWatch ? 'Project health is on watch' : 'Project is healthy';

  if (projectStatus !== 'active') return null;
  if (reasons.length === 0) return null;

  const bannerColor = isRisk
    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40'
    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40';
  const textColor = isRisk
    ? 'text-red-900 dark:text-red-300'
    : 'text-amber-900 dark:text-amber-300';

  return (
    <div className={cn('rounded-3xl border p-5', bannerColor)}>
      <p className={cn('text-lg font-semibold', textColor)}>{label}</p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {reasons.map((r, i) => (
          <div key={i} className="rounded-2xl bg-white/70 dark:bg-white/5 border border-inherit px-4 py-3 text-sm">
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}
