import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';

export function TradesTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('trades');

  return (
    <DataTableShell
      title="Trades"
      description="Platform-wide trade list used across projects."
      isLoading={isLoading}
      headers={['Name', 'Order']}
      onAdd={() => insertRow.mutate({ name: 'New Trade', display_order: (data?.length ?? 0) + 1 })}
    >
      {data?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.name} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { name: v } })} /></TableCell>
          <TableCell><EditableCell value={row.display_order} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { display_order: v } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
