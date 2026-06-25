import { cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { StatusPill } from '@/components/ui/status-pill';

interface ProjectHealthBannerProps {
  financials: ProjectFinancials;
  projectStatus: string;
}

export function ProjectHealthBanner({ financials, projectStatus }: ProjectHealthBannerProps) {
  const reasons: string[] = [];
  const { viewerRole, isTCMaterialResponsible, isGCMaterialResponsible } = financials;
  const showMaterials = isGCMaterialResponsible || isTCMaterialResponsible;

  if (showMaterials && financials.materialEstimateTotal && financials.materialOrdered > financials.materialEstimateTotal) {
    const pct = Math.round(((financials.materialOrdered - financials.materialEstimateTotal) / financials.materialEstimateTotal) * 100);
    reasons.push(`Material forecast is ${pct}% over estimate`);
  }

  if (financials.outstanding > 0 && financials.billedToDate > 0) {
    const pct = (financials.outstanding / financials.billedToDate) * 100;
    if (pct > 50) reasons.push('High outstanding balance');
  }

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
    <div className={cn('rounded-2xl border p-4', bannerColor)}>
      <p className={cn('text-[0.95rem] font-semibold', textColor)}>{label}</p>
      <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {reasons.map((r, i) => (
          <div key={i} className="rounded-xl bg-white/70 dark:bg-white/5 border border-inherit px-3 py-2.5 text-[0.8rem]">
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}
