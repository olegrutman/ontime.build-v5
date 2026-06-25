import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DT } from '@/lib/design-tokens';
import { Building2, MapPin, Pencil, Check, X } from 'lucide-react';

interface ProjectInfoCardProps {
  projectId: string;
  projectName?: string;
}

export function ProjectInfoCard({ projectId, projectName }: ProjectInfoCardProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(projectName || '');

  const { data: project } = useQuery({
    queryKey: ['project_basic', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name, address, city, state')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Sync name state when query data loads
  const resolvedName = project?.name || projectName || '';
  const displayName = project?.name || projectName || 'Untitled Project';

  // Keep name in sync with DB when not actively editing (moved to useEffect to avoid setState during render)
  React.useEffect(() => {
    if (!editing && resolvedName && name !== resolvedName) {
      setName(resolvedName);
    }
  }, [editing, resolvedName]);

  const { data: profile } = useQuery({
    queryKey: ['project_profile', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_profiles')
        .select('project_type_id')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: projectType } = useQuery({
    queryKey: ['project_type_name', profile?.project_type_id],
    enabled: !!profile?.project_type_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_types')
        .select('name, slug')
        .eq('id', profile!.project_type_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Extract street from address JSON object
  const addressObj = project?.address as any;
  const street = typeof addressObj === 'string' ? addressObj : addressObj?.street || '';
  const address = [street, project?.city, project?.state].filter(Boolean).join(', ');

  const handleSave = async () => {
    if (!name.trim()) return;
    await supabase.from('projects').update({ name: name.trim() }).eq('id', projectId);
    qc.invalidateQueries({ queryKey: ['project_basic', projectId] });
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    setEditing(false);
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-9 text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSave}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-bold truncate">
                  {displayName}
                </h3>
                <button onClick={() => { setName(displayName); setEditing(true); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {projectType && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {projectType.name}
                  </span>
                )}
                {address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {address}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
