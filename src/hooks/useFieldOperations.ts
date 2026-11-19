import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  buildFieldOperationsModel,
  type FieldOperationsItem,
  type FieldOperationsReport,
  type FieldOperationsRole,
} from '@/lib/fieldOperations';

const db = supabase as any;

const REPORT_COLUMNS = 'id,project_id,crew_org_id,reviewer_org_id,report_date,status,created_at,submitted_at,updated_at';
const ITEM_COLUMNS = 'id,report_id,project_id,crew_org_id,reviewer_org_id,kind,description,quantity,unit,status,created_at,updated_at,confirmed_at,released_at';

async function allRows(table: string, columns: string, projectId: string) {
  const rows: any[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .eq('project_id', projectId)
      .order('id')
      .range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

export function useFieldOperations(projectId: string, role: FieldOperationsRole) {
  const { user, userOrgRoles } = useAuth();
  const orgIds = useMemo(
    () => userOrgRoles.map((roleRow) => roleRow.organization_id).filter(Boolean).sort(),
    [userOrgRoles],
  );
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['field-operations-overview', projectId, role, user?.id, orgIds, today],
    enabled: !!user && !!projectId && orgIds.length > 0,
    queryFn: async () => {
      const contractsPromise = role === 'GC'
        ? Promise.resolve({ data: [], error: null })
        : db.from('project_contracts')
          .select('from_org_id,to_org_id')
          .eq('project_id', projectId)
          .in('from_org_id', orgIds);
      const [reports, items, contractsResult] = await Promise.all([
        allRows('field_reports', REPORT_COLUMNS, projectId),
        allRows('field_report_items', ITEM_COLUMNS, projectId),
        contractsPromise,
      ]);
      if (contractsResult.error) throw contractsResult.error;

      const partyIds = new Set<string>();
      for (const row of [...reports, ...items]) {
        if (row.crew_org_id) partyIds.add(row.crew_org_id);
        if (row.reviewer_org_id) partyIds.add(row.reviewer_org_id);
      }
      const ids = [...partyIds];
      const { data: companies, error: companyError } = ids.length
        ? await db.from('organizations').select('id,name').in('id', ids)
        : { data: [], error: null };
      if (companyError) throw companyError;

      return {
        reports: reports as FieldOperationsReport[],
        items: items as FieldOperationsItem[],
        companies: companies || [],
        canAuthor: role !== 'GC' && (contractsResult.data || []).some((contract: any) => !!contract.to_org_id),
      };
    },
  });

  const model = useMemo(() => query.data
    ? buildFieldOperationsModel({
        ...query.data,
        orgIds,
        currentOrgId,
        role,
        today,
      })
    : null, [query.data, orgIds, currentOrgId, role, today]);

  return { ...query, model };
}
