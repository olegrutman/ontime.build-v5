import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuggestRequest {
  project_id: string;
  description: string;
  location_tag: string;
  zone: string | null;
  reason: string;
  work_type: string | null;
  building_type: string;
  framing_method: string | null;
  answers?: Record<string, string | string[]>;
  photo_urls?: string[];
  recent_co_items?: string[];
  /** Sasha's resolved work intent — biases catalog ranking
   *  (e.g. tear_out → demolition items, not generic placeholders). */
  intent?: string | null;
}

export interface SuggestPick {
  slug: string;
  catalog_id: string;
  name: string;
  unit: string;
  confidence: number;
  reasoning: string;
  suggested_quantity: number | null;
  quantity_source: 'inferred' | 'answered' | null;
}

export interface SuggestResponse {
  picks: SuggestPick[];
  extracted: {
    quantity: number | null;
    unit_hint: string | null;
    zone_refinement: string | null;
  } | null;
  warnings: string[];
}

export function useScopeSuggestions() {
  return useMutation({
    mutationFn: async (input: SuggestRequest): Promise<SuggestResponse> => {
      const { data, error } = await supabase.functions.invoke('suggest-scope-items', {
        body: input,
      });
      if (error) throw error;
      return data as SuggestResponse;
    },
  });
}
