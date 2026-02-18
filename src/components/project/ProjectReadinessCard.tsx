import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectReadiness } from '@/hooks/useProjectReadiness';

interface ProjectReadinessCardProps {
  readiness: ProjectReadiness;
}

export function ProjectReadinessCard({ readiness }: ProjectReadinessCardProps) {
  const { percent, checklist, loading, recalculate, creatorOrgType, isActive, firstContractId } = readiness;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isActive) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span className="font-medium text-sm">Project is active and ready for execution</span>
        </CardContent>
      </Card>
    );
  }

  const isReady = percent === 100;
  const creatorLabel = creatorOrgType === 'TC' ? 'TC Setup' : creatorOrgType === 'GC' ? 'GC Setup' : 'Project Setup';

  const handleSetMaterialResp = async (value: 'GC' | 'TC') => {
    if (!firstContractId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({ material_responsibility: value })
        .eq('id', firstContractId);
      if (error) throw error;
      toast({ title: `Material responsibility set to ${value}` });
      recalculate();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn(
      "border-l-4",
      isReady ? "border-l-green-500" : "border-l-amber-500"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            {isReady ? 'Ready — Activating...' : `${creatorLabel} — ${percent}% Complete`}
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
              {item.key === 'material_resp' && !item.complete && firstContractId && (
                <div className="ml-6 mt-1.5 flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={() => handleSetMaterialResp('GC')}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    GC
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleSetMaterialResp('TC')}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    TC
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
