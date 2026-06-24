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

/** Spelled-out role names — use anywhere there is no project context. NEVER use the bare 2-letter code in UI. */
export const ROLE_LONG_NAMES: Record<RoleCode, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
};

/** Plural form when more than one org holds that role on a project. */
const ROLE_LONG_NAMES_PLURAL: Record<RoleCode, string> = {
  GC: 'General Contractors',
  TC: 'Trade Contractors',
  FC: 'Field Crews',
};

const DEFAULTS: Record<RoleCode, { long: string; short: string }> = {
  GC: { long: ROLE_LONG_NAMES.GC, short: 'GC' },
  TC: { long: ROLE_LONG_NAMES.TC, short: 'TC' },
  FC: { long: ROLE_LONG_NAMES.FC, short: 'FC' },
};

export interface RoleLabels {
  /** Full display name — org name when there's exactly one org with that role on the project, else the spelled-out role. */
  GC: string;
  TC: string;
  FC: string;
  /** Short form (first word of the resolved long form). */
  GCShort: string;
  TCShort: string;
  FCShort: string;
  /** Resolve any role code to its full label */
  label: (code: RoleCode) => string;
  /** Resolve any role code to its short label */
  short: (code: RoleCode) => string;
  /** Resolve a specific organization id to its display name (falls back to the role's long name, then ''). */
  forOrg: (orgId: string | null | undefined) => string;
}

interface ParticipantRow {
  organization_id: string;
  role: RoleCode;
  org_name: string | null;
}

function buildLabels(
  overrides: RoleLabelOverrides,
  participants: ParticipantRow[],
): RoleLabels {
  const orgNameById = new Map<string, string>();
  const namesByRole: Record<RoleCode, string[]> = { GC: [], TC: [], FC: [] };
  for (const p of participants) {
    if (p.org_name) orgNameById.set(p.organization_id, p.org_name);
    if (p.role in namesByRole && p.org_name) namesByRole[p.role].push(p.org_name);
  }

  const resolveLong = (code: RoleCode): string => {
    const ov = overrides[code];
    if (ov && ov.trim()) return ov.trim();
    const orgs = namesByRole[code];
    if (orgs.length === 1) return orgs[0];
    if (orgs.length > 1) return ROLE_LONG_NAMES_PLURAL[code];
    return DEFAULTS[code].long;
  };

  const resolveShort = (code: RoleCode, long: string): string => {
    const ovShort = overrides[`${code}_short` as keyof RoleLabelOverrides];
    if (ovShort && ovShort.trim()) return ovShort.trim();
    return abbreviate(long);
  };

  const GC = resolveLong('GC');
  const TC = resolveLong('TC');
  const FC = resolveLong('FC');
  const GCShort = resolveShort('GC', GC);
  const TCShort = resolveShort('TC', TC);
  const FCShort = resolveShort('FC', FC);

  const longMap: Record<RoleCode, string> = { GC, TC, FC };
  const shortMap: Record<RoleCode, string> = { GC: GCShort, TC: TCShort, FC: FCShort };

  return {
    GC, TC, FC,
    GCShort, TCShort, FCShort,
    label: (code) => longMap[code] ?? ROLE_LONG_NAMES[code] ?? '',
    short: (code) => shortMap[code] ?? code,
    forOrg: (orgId) => {
      if (!orgId) return '';
      return orgNameById.get(orgId) ?? '';
    },
  };
}

/** First word of a long name, used as the short form when no explicit override is set. */
function abbreviate(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? '';
  return word.length <= 12 ? word : word.substring(0, 12);
}

const EMPTY_LABELS = buildLabels({}, []);

export function useRoleLabels(projectId: string | null | undefined): RoleLabels {
  const { data } = useQuery({
    queryKey: ['role-labels', projectId],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!projectId) return { overrides: {} as RoleLabelOverrides, participants: [] as ParticipantRow[] };

      const [{ data: project }, { data: parts }] = await Promise.all([
        supabase
          .from('projects')
          .select('role_label_overrides')
          .eq('id', projectId)
          .maybeSingle(),
        supabase
          .from('project_participants')
          .select('organization_id, role, organizations(name)')
          .eq('project_id', projectId)
          .eq('invite_status', 'ACCEPTED'),
      ]);

      const overrides = (project?.role_label_overrides as RoleLabelOverrides) ?? {};
      const participants: ParticipantRow[] = (parts ?? []).map((row: any) => ({
        organization_id: row.organization_id,
        role: row.role,
        org_name: row.organizations?.name ?? null,
      }));
      return { overrides, participants };
    },
  });

  if (!data) return EMPTY_LABELS;
  return buildLabels(data.overrides, data.participants);
}

/** Convenience alias — same hook, semantically clearer at the call site. */
export const useProjectOrgLabels = useRoleLabels;
