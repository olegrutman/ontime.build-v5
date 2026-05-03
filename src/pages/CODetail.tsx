import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CODetailLayout } from '@/components/change-orders/CODetailLayout';
import { ProjectShell } from '@/components/app-shell/ProjectShell';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { ProjectBottomNav } from '@/components/project/ProjectBottomNav';

export default function CODetail() {
  const { id: projectId, coId } = useParams<{ id: string; coId: string }>();

  const { data: projectInfo } = useQuery({
    queryKey: ['project-basic-info', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name, status, contract_mode')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });

  if (!projectId || !coId) return null;

  return (
    <ProjectShell
      projectName={projectInfo?.name ?? 'Project'}
      projectId={projectId}
      projectStatus={projectInfo?.status ?? 'draft'}
    >
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar isTM={(projectInfo?.contract_mode ?? 'fixed') === 'tm'} />
        <main className="flex-1 overflow-auto lg:ml-[200px] xl:ml-[220px]">
          <CODetailLayout coId={coId} projectId={projectId} />
        </main>
        <ProjectBottomNav />
      </div>
    </ProjectShell>
  );
}
