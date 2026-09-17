import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParseStatus {
  isParsing: boolean;
  fileName: string | null;
}

/**
 * Watches for an in-flight AI read of an uploaded estimate PDF so the estimate
 * card can show progress even when the upload dialog is closed.
 */
export function useEstimateParseStatus(estimateId: string | null | undefined, onFinished?: () => void): ParseStatus {
  const [status, setStatus] = useState<ParseStatus>({ isParsing: false, fileName: null });

  useEffect(() => {
    if (!estimateId) {
      setStatus({ isParsing: false, fileName: null });
      return;
    }

    let cancelled = false;
    let wasParsing = false;

    const check = async () => {
      const { data } = await supabase
        .from('estimate_pdf_uploads')
        .select('status, file_name')
        .eq('estimate_id', estimateId)
        .in('status', ['pending', 'processing'])
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const isParsing = !!data;
      if (wasParsing && !isParsing) onFinished?.();
      wasParsing = isParsing;
      setStatus({ isParsing, fileName: data?.file_name ?? null });
    };

    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId]);

  return status;
}
