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
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          🚧 Blocked: Waiting on {rfi.rfi_number} — {rfi.title}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          This change order is paused until the linked RFI is answered.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
        onClick={() => navigate(`/project/${projectId}/rfis/${rfi.id}`)}
      >
        View RFI
      </Button>
    </div>
  );
}
