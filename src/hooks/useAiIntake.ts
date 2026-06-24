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
  reasoning: string;
}

export interface AiIntakeResult {
  intake_id: string;
  lines: AiIntakeLine[];
}

export function useRunAiIntake() {
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      source_kind: 'paste' | 'voice';
      raw_text?: string;
      voice_url?: string;
    }): Promise<AiIntakeResult> => {
      const { data, error } = await supabase.functions.invoke('co-ai-intake', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AiIntakeResult;
    },
  });
}

export function useAiIntake(intakeId: string | null | undefined) {
  return useQuery({
    queryKey: ['co-ai-intake', intakeId],
    enabled: !!intakeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_ai_intakes')
        .select('*')
        .eq('id', intakeId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
