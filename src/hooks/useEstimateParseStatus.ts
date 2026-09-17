import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedPack } from '@/lib/parseEstimateCSV';

export type EstimateParseStage = 'none' | 'reading' | 'ready' | 'failed';

export interface EstimateParseState {
  stage: EstimateParseStage;
  uploadId: string | null;
  fileName: string | null;
  errorMessage: string | null;
  totalItems: number;
  packs: ParsedPack[];
  warnings: string[];
  estimateTotal: number | null;
  /** Re-read the current state immediately. */
  refresh: () => void;
  /** Throw away a finished-but-unreviewed read so the card goes clean. */
  discard: () => Promise<void>;
}

const EMPTY: Omit<EstimateParseState, 'refresh' | 'discard'> = {
  stage: 'none',
  uploadId: null,
  fileName: null,
  errorMessage: null,
  totalItems: 0,
  packs: [],
  warnings: [],
  estimateTotal: null,
};

/**
 * Tracks the AI read of an uploaded estimate PDF so the estimate card can say
 * exactly what happened — reading, ready to review, or failed — even when the
 * supplier navigated away from the upload dialog.
 */
export function useEstimateParseStatus(
  estimateId: string | null | undefined,
  onFinished?: (stage: EstimateParseStage, errorMessage: string | null) => void,
): EstimateParseState {
  const [state, setState] = useState(EMPTY);
  const [tick, setTick] = useState(0);
  const wasReadingRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!estimateId) {
      setState(EMPTY);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const [{ data: upload }, { count }] = await Promise.all([
        supabase
          .from('estimate_pdf_uploads')
          .select('id, status, file_name, error_message, parsed_result')
          .eq('estimate_id', estimateId)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('supplier_estimate_items')
          .select('id', { count: 'exact', head: true })
          .eq('estimate_id', estimateId),
      ]);

      if (cancelled) return;

      if (!upload) {
        wasReadingRef.current = false;
        setState(EMPTY);
        return;
      }

      const parsed = (upload.parsed_result || null) as Record<string, unknown> | null;
      const packs = (parsed?.packs as ParsedPack[]) || [];
      const reading = upload.status === 'pending' || upload.status === 'processing';
      const savedItems = count ?? 0;

      let stage: EstimateParseStage = 'none';
      if (reading) stage = 'reading';
      else if (upload.status === 'failed') stage = 'failed';
      else if (upload.status === 'completed' && packs.length > 0 && savedItems === 0) stage = 'ready';

      if (wasReadingRef.current && !reading) onFinished?.(stage, upload.error_message ?? null);
      wasReadingRef.current = reading;

      setState({
        stage,
        uploadId: upload.id,
        fileName: upload.file_name ?? null,
        errorMessage: upload.error_message ?? null,
        totalItems: (parsed?.totalItems as number) ?? packs.reduce((s, p) => s + p.items.length, 0),
        packs,
        warnings: (parsed?.warnings as string[]) || [],
        estimateTotal: (parsed?.estimate_total as number) ?? null,
        });
    };

    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId, tick]);

  const discard = useCallback(async () => {
    if (!state.uploadId) return;
    await supabase.from('estimate_pdf_uploads').delete().eq('id', state.uploadId);
    try { localStorage.removeItem(`estimate-pdf-parse:${estimateId}`); } catch { /* ignore */ }
    setState(EMPTY);
    refresh();
  }, [estimateId, refresh, state.uploadId]);

  return { ...state, refresh, discard };
}
