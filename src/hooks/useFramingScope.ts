import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FramingScopeAnswers, createDefaultAnswers } from '@/types/framingScope';

/** Maps profile building features → scope Section 2 defaults */
function seedStructureFromProfile(
  answers: FramingScopeAnswers,
  profile: { has_stairs?: boolean; has_elevator?: boolean; has_corridors?: boolean; has_balcony?: boolean; has_garage?: boolean } | null,
): FramingScopeAnswers {
  if (!profile) return answers;
  const s = answers.structure;
  // Only seed if the scope value is still null (user hasn't touched it)
  return {
    ...answers,
    structure: {
      ...s,
      wood_stairs: s.wood_stairs ?? (profile.has_stairs ? 'yes' : null),
      elevator_shaft: s.elevator_shaft ?? (profile.has_elevator ? 'yes' : null),
      enclosed_corridors: s.enclosed_corridors ?? (profile.has_corridors ? 'yes' : null),
      balconies: s.balconies ?? (profile.has_balcony ? 'yes' : null),
      tuck_under_garages: s.tuck_under_garages ?? (profile.has_garage ? 'yes' : null),
    },
  };
}

export function useFramingScope(projectId: string | undefined) {
  const qc = useQueryClient();
  const [answers, setAnswersState] = useState<FramingScopeAnswers>(createDefaultAnswers());
  const [currentSection, setCurrentSection] = useState(0);
  const [scopeComplete, setScopeComplete] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const seededRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load from DB
  const { data: dbRow, isLoading } = useQuery({
    queryKey: ['framing-scope', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_framing_scope' as any)
        .select('*')
        .eq('project_id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Load profile for seeding
  const { data: profile } = useQuery({
    queryKey: ['project_profile', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_profiles')
        .select('has_stairs, has_elevator, has_corridors, has_balcony, has_garage')
        .eq('project_id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Hydrate local state from DB
  useEffect(() => {
    if (dbRow) {
      const saved = dbRow.answers as unknown as FramingScopeAnswers;
      setAnswersState({ ...createDefaultAnswers(), ...saved });
      setCurrentSection(dbRow.current_section ?? 0);
      setScopeComplete(dbRow.scope_complete ?? false);
      setHasLoaded(true);
    } else if (dbRow === null && !isLoading) {
      setHasLoaded(true);
    }
  }, [dbRow, isLoading]);

  // Seed structure defaults from profile (only once, only for new records)
  useEffect(() => {
    if (hasLoaded && !dbRow && profile && !seededRef.current) {
      seededRef.current = true;
      setAnswersState(prev => seedStructureFromProfile(prev, profile));
    }
  }, [hasLoaded, dbRow, profile]);

  // Upsert mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { answers: FramingScopeAnswers; section: number; complete: boolean }) => {
      const row = {
        project_id: projectId!,
        answers: payload.answers as any,
        current_section: payload.section,
        scope_complete: payload.complete,
        updated_at: new Date().toISOString(),
        ...(payload.complete ? { generated_at: new Date().toISOString() } : {}),
      };

      if (dbRow) {
        const { error } = await supabase
          .from('project_framing_scope' as any)
          .update(row as any)
          .eq('id', dbRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_framing_scope' as any)
          .insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['framing-scope', projectId] });
    },
  });

  // Debounced save
  const save = useCallback((a: FramingScopeAnswers, section: number, complete: boolean) => {
    if (!projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ answers: a, section, complete });
    }, 800);
  }, [projectId, saveMutation]);

  // Set a nested answer using dot path
  const setAnswer = useCallback((path: string, value: any) => {
    setAnswersState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next as any;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      save(next, currentSection, scopeComplete);
      return next;
    });
  }, [save, currentSection, scopeComplete]);

  const goToSection = useCallback((idx: number) => {
    setCurrentSection(idx);
    save(answers, idx, scopeComplete);
  }, [answers, scopeComplete, save]);

  const markComplete = useCallback(() => {
    setScopeComplete(true);
    save(answers, currentSection, true);
  }, [answers, currentSection, save]);

  const editScope = useCallback(() => {
    setScopeComplete(false);
  }, []);

  return {
    answers,
    setAnswer,
    currentSection,
    goToSection,
    scopeComplete,
    markComplete,
    editScope,
    isLoading,
    hasLoaded,
    isSaving: saveMutation.isPending,
    hasExistingRecord: !!dbRow,
  };
}
