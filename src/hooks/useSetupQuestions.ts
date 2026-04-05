import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo } from 'react';

/* ── Types ─────────────────────────────────────────────────────────── */
export interface SetupQuestion {
  id: string;
  phase: number;
  phase_name: string;
  section: string;
  sort_order: number;
  label: string;
  field_key: string;
  input_type: string;
  trigger_condition: string | null;
  options_by_type: Record<string, any>;
  notes: string | null;
}

export interface SetupAnswer {
  field_key: string;
  value: any;
}

export interface SectionGroup {
  section: string;
  questions: SetupQuestion[];
}

/* ── Trigger evaluation ────────────────────────────────────────────── */
function evaluateTrigger(
  trigger: string | null,
  answers: Record<string, any>,
): boolean {
  if (!trigger) return true;
  // Handle "field=value" and "field!=value"
  const neq = trigger.match(/^(\w+)!=(.+)$/);
  if (neq) {
    const [, key, val] = neq;
    const current = answers[key];
    if (current === undefined || current === null) return false;
    return String(current) !== val;
  }
  const eq = trigger.match(/^(\w+)=(.+)$/);
  if (eq) {
    const [, key, val] = eq;
    const current = answers[key];
    if (current === undefined || current === null) return false;
    return String(current).toLowerCase() === val.toLowerCase();
  }
  return true;
}

/* ── Main hook ─────────────────────────────────────────────────────── */
export function useSetupQuestions(projectId: string, phase?: number) {
  const qc = useQueryClient();

  // Fetch all questions (or filtered by phase)
  const questionsQuery = useQuery({
    queryKey: ['setup_questions', phase ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('setup_questions')
        .select('*')
        .order('phase')
        .order('sort_order');
      if (phase) q = q.eq('phase', phase);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SetupQuestion[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch answers for this project
  const answersQuery = useQuery({
    queryKey: ['setup_answers', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_setup_answers')
        .select('field_key, value')
        .eq('project_id', projectId);
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const row of data ?? []) {
        map[(row as any).field_key] = (row as any).value;
      }
      return map;
    },
  });

  const answers = answersQuery.data ?? {};
  const questions = questionsQuery.data ?? [];

  // Filter questions by building type visibility and trigger conditions
  const getVisibleQuestions = useCallback(
    (buildingTypeSlug: string): SetupQuestion[] => {
      return questions.filter((q) => {
        // Check if question has options for this building type (N/A = hidden)
        const opts = q.options_by_type[buildingTypeSlug];
        if (opts === undefined || opts === null) return false;
        // Check trigger condition
        return evaluateTrigger(q.trigger_condition, answers);
      });
    },
    [questions, answers],
  );

  // Group visible questions by section
  const getSections = useCallback(
    (buildingTypeSlug: string): SectionGroup[] => {
      const visible = getVisibleQuestions(buildingTypeSlug);
      const groups: Record<string, SetupQuestion[]> = {};
      const order: string[] = [];
      for (const q of visible) {
        if (!groups[q.section]) {
          groups[q.section] = [];
          order.push(q.section);
        }
        groups[q.section].push(q);
      }
      return order.map((s) => ({ section: s, questions: groups[s] }));
    },
    [getVisibleQuestions],
  );

  // Get options for a question given current building type
  const getOptions = useCallback(
    (q: SetupQuestion, buildingTypeSlug: string): string[] | null => {
      const opts = q.options_by_type[buildingTypeSlug];
      if (Array.isArray(opts)) return opts;
      return null;
    },
    [],
  );

  // Save answer mutation
  const saveMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: any }) => {
      const { error } = await supabase
        .from('project_setup_answers')
        .upsert(
          {
            project_id: projectId,
            field_key: fieldKey,
            value: value === undefined ? null : value,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'project_id,field_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup_answers', projectId] });
    },
  });

  const saveAnswer = useCallback(
    (fieldKey: string, value: any) => {
      // Optimistic local update
      qc.setQueryData(['setup_answers', projectId], (prev: Record<string, any> | undefined) => ({
        ...(prev ?? {}),
        [fieldKey]: value,
      }));
      saveMutation.mutate({ fieldKey, value });
    },
    [projectId, saveMutation, qc],
  );

  // Compute completion per phase
  const getPhaseCompletion = useCallback(
    (phaseNum: number, buildingTypeSlug: string) => {
      const phaseQuestions = questions.filter((q) => q.phase === phaseNum);
      const visible = phaseQuestions.filter((q) => {
        const opts = q.options_by_type[buildingTypeSlug];
        if (opts === undefined || opts === null) return false;
        return evaluateTrigger(q.trigger_condition, answers);
      });
      const answered = visible.filter((q) => {
        const val = answers[q.field_key];
        return val !== undefined && val !== null && val !== '' && val !== 'null';
      });
      return { total: visible.length, answered: answered.length };
    },
    [questions, answers],
  );

  return {
    questions,
    answers,
    isLoading: questionsQuery.isLoading || answersQuery.isLoading,
    getVisibleQuestions,
    getSections,
    getOptions,
    saveAnswer,
    isSaving: saveMutation.isPending,
    getPhaseCompletion,
    refetchAnswers: answersQuery.refetch,
  };
}
