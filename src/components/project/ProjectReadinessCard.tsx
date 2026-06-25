import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectReadiness } from '@/hooks/useProjectReadiness';

interface ProjectReadinessCardProps {
  readiness: ProjectReadiness;
}

export function ProjectReadinessCard({ readiness }: ProjectReadinessCardProps) {
  const { percent, checklist, loading, recalculate, creatorOrgType, isActive } = readiness;

  if (loading) {
    return (
      <SurfaceCard data-sasha-card="Project Readiness">
        <SurfaceCardBody className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </SurfaceCardBody>
      </SurfaceCard>
    );
  }

  if (isActive) {
    return (
      <SurfaceCard data-sasha-card="Project Readiness">
        <SurfaceCardBody className="flex items-center gap-3">
          <StatusPill variant="healthy">Active</StatusPill>
          <span className="font-medium text-sm">Project is active and ready for execution</span>
        </SurfaceCardBody>
      </SurfaceCard>
    );
  }

  const isReady = percent === 100;
  const creatorLabel = creatorOrgType === 'TC' ? 'TC Setup' : creatorOrgType === 'GC' ? 'GC Setup' : 'Project Setup';

  return (
    <SurfaceCard data-sasha-card="Project Readiness">
      <SurfaceCardHeader
        title={isReady ? 'Ready — Activating...' : `${creatorLabel} — ${percent}% Complete`}
        action={
          <StatusPill variant={isReady ? 'healthy' : 'watch'}>
            {isReady ? 'Ready' : 'In Progress'}
          </StatusPill>
        }
      />
      <SurfaceCardBody className="space-y-4">
        <Progress value={percent} className="h-2" />
        
        <div className="space-y-2">
          {checklist.map(item => (
            <div key={item.key}>
              <div className="flex items-center gap-2 text-sm">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : item.informational ? (
                  <Info className="h-4 w-4 text-blue-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  item.complete ? 'text-foreground' : item.informational ? 'text-blue-400' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </div>
              {item.key === 'material_resp' && !item.complete && (
                <p className="ml-6 mt-1 text-[11px] text-muted-foreground">Set in Team card below</p>
              )}
            </div>
          ))}
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
