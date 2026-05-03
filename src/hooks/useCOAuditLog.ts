import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface COAuditEntry {
  id: string;
  co_id: string;
  source_table: string;
  source_row_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
}

export function useCOAuditLog(coId: string | undefined) {
  return useQuery({
    queryKey: ['co-audit-log', coId],
    enabled: !!coId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_audit_log' as any)
        .select('*')
        .eq('co_id', coId!)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as COAuditEntry[];
    },
  });
}
