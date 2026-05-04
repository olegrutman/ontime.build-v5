import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateCONumber } from '@/lib/generateCONumber';
import { ProjectShell } from '@/components/app-shell/ProjectShell';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { ProjectBottomNav } from '@/components/project/ProjectBottomNav';
import { CODetailLayout } from '@/components/change-orders/CODetailLayout';

export default function CONewDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const [createdCoId, setCreatedCoId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const orgType = userOrgRoles?.[0]?.organization?.type ?? 'TC';

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

  const isTM = projectInfo?.contract_mode === 'tm';

  useEffect(() => {
    if (!projectId || !user || !orgId || creating || createdCoId) return;

    async function createDraft() {
      setCreating(true);
      try {
        // Resolve assigned_to_org_id
        let assignedToOrgId: string | null = null;
        const detectedRole = orgType === 'GC' ? 'GC' : orgType === 'FC' ? 'FC' : 'TC';

        if (detectedRole === 'GC') {
          const { data: tcP } = await supabase
            .from('project_participants')
            .select('organization_id')
            .eq('project_id', projectId!)
            .eq('role', 'TC')
            .eq('invite_status', 'ACCEPTED')
            .maybeSingle();
          assignedToOrgId = tcP?.organization_id ?? null;
        } else if (detectedRole === 'TC') {
          const { data: gcP } = await supabase
            .from('project_participants')
            .select('organization_id')
            .eq('project_id', projectId!)
            .eq('role', 'GC')
            .eq('invite_status', 'ACCEPTED')
            .maybeSingle();
          assignedToOrgId = gcP?.organization_id ?? null;
        }

        const docType = isTM ? 'WO' : 'CO';
        const coNumber = await generateCONumber({
          projectId: projectId!,
          creatorOrgId: orgId!,
          assignedToOrgId,
          isTM: docType === 'WO',
        });

        const { data: co, error } = await supabase
          .from('change_orders')
          .insert({
            org_id: orgId,
            project_id: projectId,
            created_by_user_id: user!.id,
            created_by_role: detectedRole,
            co_number: coNumber,
            title: coNumber,
            status: 'draft',
            pricing_type: 'tm',
            document_type: docType,
            reason: null,
            location_tag: null,
            assigned_to_org_id: assignedToOrgId,
          })
          .select('id')
          .single();

        if (error) throw error;
        setCreatedCoId(co.id);
        // Replace URL so back navigation works correctly
        navigate(`/project/${projectId}/change-orders/${co.id}`, { replace: true });
      } catch (err) {
        console.error('Failed to create draft CO:', err);
        navigate(`/project/${projectId}/change-orders`, { replace: true });
      }
    }

    createDraft();
  }, [projectId, user, orgId, creating, createdCoId, orgType, isTM, navigate]);

  if (!projectId) return null;

  // While creating, show spinner
  if (!createdCoId) {
    return (
      <ProjectShell
        projectName={projectInfo?.name ?? 'Project'}
        projectId={projectId}
        projectStatus={projectInfo?.status ?? 'draft'}
      >
        <div className="flex flex-1 overflow-hidden">
          <ProjectSidebar isTM={isTM ?? false} />
          <main className="flex-1 overflow-auto lg:ml-[200px] xl:ml-[220px] flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Creating {isTM ? 'work order' : 'change order'}…</p>
            </div>
          </main>
          <ProjectBottomNav />
        </div>
      </ProjectShell>
    );
  }

  // Once created, render the detail layout directly (URL already changed)
  return (
    <ProjectShell
      projectName={projectInfo?.name ?? 'Project'}
      projectId={projectId}
      projectStatus={projectInfo?.status ?? 'draft'}
    >
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar isTM={isTM ?? false} />
        <main className="flex-1 overflow-auto lg:ml-[200px] xl:ml-[220px]">
          <CODetailLayout coId={createdCoId} projectId={projectId} />
        </main>
        <ProjectBottomNav />
      </div>
    </ProjectShell>
  );
}
