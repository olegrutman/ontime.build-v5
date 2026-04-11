import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CODetailLayout } from '@/components/change-orders/CODetailLayout';

export default function CODetail() {
  const { id: projectId, coId } = useParams<{ id: string; coId: string }>();

  const { data: contractMode } = useQuery({
    queryKey: ['project-contract-mode', projectId],
    queryFn: async () => {
      if (!projectId) return 'fixed';
      const { data } = await supabase
        .from('projects')
        .select('contract_mode')
        .eq('id', projectId)
        .single();
      return (data?.contract_mode as string) ?? 'fixed';
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });

  if (!projectId || !coId) return null;
  return <CODetailLayout coId={coId} projectId={projectId} isTM={contractMode === 'tm'} />;
}
