import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface CORFIBlockBannerProps {
  blockedByRfiId: string | null | undefined;
  projectId: string;
}

export function CORFIBlockBanner({ blockedByRfiId, projectId }: CORFIBlockBannerProps) {
  const navigate = useNavigate();

  const { data: rfi } = useQuery({
    queryKey: ['rfi-block-banner', blockedByRfiId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rfis')
        .select('id, rfi_number, title, status')
        .eq('id', blockedByRfiId!)
        .single();
      return data;
    },
    enabled: !!blockedByRfiId,
  });

  if (!blockedByRfiId || !rfi) return null;
  // If the RFI is already answered/closed, don't show the block banner
  if (rfi.status === 'answered' || rfi.status === 'closed') return null;

  return (
    <div className="bg-state-open-bg border border-state-open/30 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-state-open shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-state-open-foreground">
          Blocked: Waiting on {rfi.rfi_number} — {rfi.title}
        </p>
        <p className="text-xs text-state-open-foreground mt-0.5">
          This change order is paused until the linked RFI is answered.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs border-state-open text-state-open-foreground hover:bg-state-open-bg"
        onClick={() => navigate(`/project/${projectId}/rfis/${rfi.id}`)}
      >
        View RFI
      </Button>
    </div>
  );
}
