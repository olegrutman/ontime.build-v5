import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  buildFieldOperationsModel,
  type FieldOperationsModel,
  type FieldOperationsRole,
} from '@/lib/fieldOperations';

const db = supabase as any;
const REPORT_COLUMNS = 'id,project_id,crew_org_id,reviewer_org_id,report_date,status,created_at,submitted_at,updated_at';
const ITEM_COLUMNS = 'id,report_id,project_id,crew_org_id,reviewer_org_id,kind,description,quantity,unit,status,created_at,updated_at,confirmed_at,released_at';

async function allRows(table: string, columns: string, projectIds: string[]) {
  const rows: any[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from(table).select(columns)
      .in('project_id', projectIds)
      .order('id').range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

export interface PortfolioFieldRow { projectId: string; projectName: string; model: FieldOperationsModel; }

/** Per-project Field Operations models for the dashboard; same release boundary as the Overview card. */
export function useFieldOperationsPortfolio(projects: { id: string; name: string }[], role: FieldOperationsRole) {
  const { user, userOrgRoles } = useAuth();
  const orgIds = useMemo(() => userOrgRoles.map((r) => r.organization_id).filter(Boolean).sort(), [userOrgRoles]);
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const today = format(new Date(), 'yyyy-MM-dd');
  const projectIds = useMemo(() => projects.map((p) => p.id).sort(), [projects]);

  const query = useQuery({
    queryKey: ['field-operations-portfolio', projectIds, role, user?.id, orgIds, today],
    enabled: !!user && projectIds.length > 0 && orgIds.length > 0,
    queryFn: async () => {
      const [reports, items, contracts] = await Promise.all([
        allRows('field_reports', REPORT_COLUMNS, projectIds),
        allRows('field_report_items', ITEM_COLUMNS, projectIds),
        role === 'GC' ? Promise.resolve({ data: [], error: null })
          : db.from('project_contracts').select('project_id,to_org_id').in('project_id', projectIds).in('from_org_id', orgIds),
      ]);
      if (contracts.error) throw contracts.error;
      const ids = [...new Set([...reports, ...items].flatMap((r: any) => [r.crew_org_id, r.reviewer_org_id]).filter(Boolean))];
      const { data: companies, error } = ids.length
        ? await db.from('organizations').select('id,name').in('id', ids) : { data: [], error: null };
      if (error) throw error;
      return { reports, items, companies: companies || [], contracts: contracts.data || [] };
    },
  });

  const rows = useMemo<PortfolioFieldRow[]>(() => {
    if (!query.data) return [];
    const { reports, items, companies, contracts } = query.data;
    return projects.map((p) => ({
      projectId: p.id,
      projectName: p.name,
      model: buildFieldOperationsModel({
        reports: reports.filter((r: any) => r.project_id === p.id),
        items: items.filter((i: any) => i.project_id === p.id),
        companies, orgIds, currentOrgId, role, today,
        canAuthor: role !== 'GC' && contracts.some((c: any) => c.project_id === p.id && !!c.to_org_id),
      }),
    }));
  }, [query.data, projects, orgIds, currentOrgId, role, today]);

  return { ...query, rows };
}

/** Urgency order: blockers, then awaiting your review, then today's activity, then the rest. */
export function rankPortfolioRows(rows: PortfolioFieldRow[]) {
  const score = (m: FieldOperationsModel) =>
    m.todayBlockers.length ? 0 : m.pendingReviewReports.length ? 1 : m.todayReports.length ? 2 : m.reports.length ? 3 : 4;
  return [...rows].sort((a, b) => score(a.model) - score(b.model) || a.projectName.localeCompare(b.projectName));
}
