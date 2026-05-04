import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';

export default function ProjectSettings() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userOrgRoles } = useAuth();
  const orgType = userOrgRoles?.[0]?.organization?.type;
  const isGC = orgType === 'GC';

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-settings', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, tc_markup_visibility, require_photos_on_submit, role_label_overrides')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [markupVis, setMarkupVis] = useState<MarkupVisibility>('hidden');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setMarkupVis((project.tc_markup_visibility as MarkupVisibility) ?? 'hidden');
    }
  }, [project]);

  async function saveMarkupVisibility(value: MarkupVisibility) {
    setMarkupVis(value);
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({ tc_markup_visibility: value })
      .eq('id', projectId!);
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Markup disclosure updated');
      queryClient.invalidateQueries({ queryKey: ['project-co-settings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['markup-visibility', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isGC) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Only GC organizations can manage project settings.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-2.5 max-w-3xl mx-auto w-full">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Project Settings</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{project?.name ?? 'Project'} Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure project-level behavior and visibility rules.</p>
        </div>

        {/* Markup Disclosure */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Markup Disclosure
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Controls how much TC cost breakdown is visible to you (GC) on change orders.
            </p>
          </div>

          <RadioGroup value={markupVis} onValueChange={(v) => saveMarkupVisibility(v as MarkupVisibility)} className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="hidden" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Hidden</p>
                <p className="text-xs text-muted-foreground">Lump sum / fixed price contracts. GC sees only the final submitted amount.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="summary" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Summary</p>
                <p className="text-xs text-muted-foreground">T&M contracts. GC sees labor and material totals, but not individual rates or hours.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="detailed" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Detailed</p>
                <p className="text-xs text-muted-foreground">Cost-plus / GMP contracts. GC sees rates, hours, internal costs, and TC margin.</p>
              </div>
            </label>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
