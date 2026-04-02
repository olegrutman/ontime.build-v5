import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';

export function ScopeSectionsTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('scope_sections');

  return (
    <DataTableShell
      title="Scope Sections"
      description="Section headings in the scope wizard. Order determines display sequence."
      isLoading={isLoading}
      headers={['Label', 'Slug', 'Order', 'Always Visible', 'Required Feature', 'Description']}
      onAdd={() => insertRow.mutate({ slug: 'new-section', label: 'New Section', display_order: (data?.length ?? 0) + 1 })}
    >
      {data?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.label} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { label: v } })} /></TableCell>
          <TableCell><EditableCell value={row.slug} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { slug: v } })} /></TableCell>
          <TableCell><EditableCell value={row.display_order} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { display_order: v } })} /></TableCell>
          <TableCell><EditableCell value={row.always_visible} type="boolean" onChange={(v) => updateRow.mutate({ id: row.id, changes: { always_visible: v } })} /></TableCell>
          <TableCell><EditableCell value={row.required_feature} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { required_feature: v || null } })} /></TableCell>
          <TableCell><EditableCell value={row.description} type="text" className="h-8 text-xs min-w-[200px]" onChange={(v) => updateRow.mutate({ id: row.id, changes: { description: v || null } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
