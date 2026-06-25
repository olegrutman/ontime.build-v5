import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AiIntakeLine {
  order: number;
  title: string;
  problem: string;
  catalog_slug: string | null;
  catalog_name: string | null;
  scenario_id: string | null;
  location_hint: string | null;
  qty: number | null;
  unit: string | null;
  group_key: string | null;
  confidence: number;
  reasoning?: string;
}

export interface AiIntakeStartResult {
  intake_id: string;
  status: 'pending';
}

/** Start an async intake job. Returns immediately with the intake_id. */
export function useStartAiIntake() {
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      source_kind: 'paste' | 'voice';
      raw_text?: string;
      voice_url?: string;
    }): Promise<AiIntakeStartResult> => {
      const { data, error } = await supabase.functions.invoke('co-ai-intake', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AiIntakeStartResult;
    },
  });
}

/** Back-compat alias for older call sites. */
export const useRunAiIntake = useStartAiIntake;

/** Poll an intake row until status leaves 'pending'. */
export function useAiIntake(intakeId: string | null | undefined) {
  return useQuery({
    queryKey: ['co-ai-intake', intakeId],
    enabled: !!intakeId,
    refetchInterval: (query) => {
      const row = query.state.data as { status?: string } | undefined;
      if (!row?.status || row.status === 'pending') return 1500;
      return false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_ai_intakes')
        .select('id, status, output_json, error_message, model, raw_text')
        .eq('id', intakeId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function linesFromIntake(row: { output_json?: any } | null | undefined): AiIntakeLine[] {
  const raw = row?.output_json?.lines;
  if (!Array.isArray(raw)) return [];
  return raw.map((l: any, i: number) => ({
    order: l.order ?? i + 1,
    title: l.title ?? '',
    problem: l.problem ?? '',
    catalog_slug: l.catalog_slug ?? null,
    catalog_name: l.catalog_name ?? null,
    scenario_id: l.scenario_id ?? null,
    location_hint: l.location_hint ?? null,
    qty: l.qty ?? null,
    unit: l.unit ?? null,
    group_key: l.group_key ?? null,
    confidence: l.confidence ?? 0.7,
    reasoning: l.reasoning,
  }));
}
