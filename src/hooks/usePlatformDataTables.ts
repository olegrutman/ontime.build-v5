import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TableName =
  | 'project_types'
  | 'scope_sections'
  | 'scope_items'
  | 'contract_scope_categories'
  | 'trades'
  | 'sov_templates';

const ORDER_COLUMNS: Record<TableName, string> = {
  project_types: 'name',
  scope_sections: 'display_order',
  scope_items: 'display_order',
  contract_scope_categories: 'display_order',
  trades: 'display_order',
  sov_templates: 'template_key',
};

export function usePlatformTable<T extends Record<string, any>>(tableName: TableName) {
  const qc = useQueryClient();
  const key = ['platform-data', tableName];
  const orderCol = ORDER_COLUMNS[tableName];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase.from(tableName) as any)
        .select('*')
        .order(orderCol);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<T> }) => {
      const { error } = await (supabase.from(tableName) as any)
        .update(changes)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Row updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const insertRow = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { error } = await (supabase.from(tableName) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Row added' });
    },
    onError: (e: any) => toast({ title: 'Insert failed', description: e.message, variant: 'destructive' }),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(tableName) as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Row deleted' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  return { ...query, updateRow, insertRow, deleteRow };
}
