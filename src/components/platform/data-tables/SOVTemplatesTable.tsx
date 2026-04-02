import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';

export function SOVTemplatesTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('sov_templates');

  return (
    <DataTableShell
      title="SOV Templates"
      description="Schedule of Values template definitions."
      isLoading={isLoading}
      headers={['Template Key', 'Display Name', 'Description']}
      onAdd={() => insertRow.mutate({ template_key: 'new_template', display_name: 'New Template' })}
    >
      {data?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.template_key} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { template_key: v } })} /></TableCell>
          <TableCell><EditableCell value={row.display_name} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { display_name: v } })} /></TableCell>
          <TableCell><EditableCell value={row.description} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { description: v || null } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
