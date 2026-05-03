import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RoleCode = 'GC' | 'TC' | 'FC';

interface RoleLabelOverrides {
  GC?: string;
  TC?: string;
  FC?: string;
  GC_short?: string;
  TC_short?: string;
  FC_short?: string;
}

const DEFAULTS: Record<RoleCode, { long: string; short: string }> = {
  GC: { long: 'General Contractor', short: 'GC' },
  TC: { long: 'Trade Contractor', short: 'TC' },
  FC: { long: 'Field Crew', short: 'FC' },
};

export interface RoleLabels {
  /** Full display name, e.g. "Owner" or "General Contractor" */
  GC: string;
  TC: string;
  FC: string;
  /** Short abbreviation, e.g. "GC" or "Owner" */
  GCShort: string;
  TCShort: string;
  FCShort: string;
  /** Resolve any role code to its full label */
  label: (code: RoleCode) => string;
  /** Resolve any role code to its short label */
  short: (code: RoleCode) => string;
}

function buildLabels(overrides: RoleLabelOverrides): RoleLabels {
  const GC = overrides.GC || DEFAULTS.GC.long;
  const TC = overrides.TC || DEFAULTS.TC.long;
  const FC = overrides.FC || DEFAULTS.FC.long;
  const GCShort = overrides.GC_short || (overrides.GC ? abbreviate(overrides.GC) : DEFAULTS.GC.short);
  const TCShort = overrides.TC_short || (overrides.TC ? abbreviate(overrides.TC) : DEFAULTS.TC.short);
  const FCShort = overrides.FC_short || (overrides.FC ? abbreviate(overrides.FC) : DEFAULTS.FC.short);

  const longMap: Record<RoleCode, string> = { GC, TC, FC };
  const shortMap: Record<RoleCode, string> = { GC: GCShort, TC: TCShort, FC: FCShort };

  return {
    GC, TC, FC,
    GCShort, TCShort, FCShort,
    label: (code: RoleCode) => longMap[code] ?? code,
    short: (code: RoleCode) => shortMap[code] ?? code,
  };
}

/** Derive a short name from a long name — first word */
function abbreviate(name: string): string {
  const word = name.trim().split(/\s+/)[0];
  return word.length <= 4 ? word : word.substring(0, 3);
}

const DEFAULT_LABELS = buildLabels({});

export function useRoleLabels(projectId: string | null | undefined): RoleLabels {
  const { data } = useQuery({
    queryKey: ['role-label-overrides', projectId],
    queryFn: async () => {
      if (!projectId) return {};
      const { data, error } = await supabase
        .from('projects')
        .select('role_label_overrides')
        .eq('id', projectId)
        .single();
      if (error) return {};
      return (data?.role_label_overrides as RoleLabelOverrides) ?? {};
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || Object.keys(data).length === 0) return DEFAULT_LABELS;
  return buildLabels(data);
}
