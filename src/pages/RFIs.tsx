import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { RFIsTab } from '@/components/rfi';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ProjectOption {
  id: string;
  name: string;
}

export default function RFIs() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProjects(data);
          setSelectedProjectId(data[0].id);
        }
      });
  }, [user]);

  return (
    <AppLayout title="RFIs">
      <div className="space-y-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-64 bg-card border border-border">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProjectId && <RFIsTab projectId={selectedProjectId} />}
      </div>
    </AppLayout>
  );
}
