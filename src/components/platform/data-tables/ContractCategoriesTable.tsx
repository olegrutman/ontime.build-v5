import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';

export function ContractCategoriesTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('contract_scope_categories');

  return (
    <DataTableShell
      title="Contract Scope Categories"
      description="Category labels shown in the contract scope wizard."
      isLoading={isLoading}
      headers={['Label', 'Slug', 'Order']}
      onAdd={() => insertRow.mutate({ slug: 'new-category', label: 'New Category', display_order: (data?.length ?? 0) + 1 })}
    >
      {data?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.label} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { label: v } })} /></TableCell>
          <TableCell><EditableCell value={row.slug} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { slug: v } })} /></TableCell>
          <TableCell><EditableCell value={row.display_order} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { display_order: v } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
