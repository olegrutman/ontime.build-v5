import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectReadiness } from '@/hooks/useProjectReadiness';

interface ProjectReadinessCardProps {
  readiness: ProjectReadiness;
}

export function ProjectReadinessCard({ readiness }: ProjectReadinessCardProps) {
  const { percent, checklist, loading } = readiness;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isReady = percent === 100;

  return (
    <Card className={cn(
      "border-l-4",
      isReady ? "border-l-green-500" : "border-l-amber-500"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            {isReady ? 'Ready to Execute' : `Setup Incomplete (${percent}%)`}
          </span>
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} className="h-2" />
        
        <div className="space-y-2">
          {checklist.map(item => (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              {item.complete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={cn(
                item.complete ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
