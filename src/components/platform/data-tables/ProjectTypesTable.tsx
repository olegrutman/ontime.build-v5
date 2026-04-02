import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';

export function ProjectTypesTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('project_types');

  return (
    <DataTableShell
      title="Project Types"
      description="Building type options shown during project creation."
      isLoading={isLoading}
      headers={['Name', 'Slug', 'Single Family', 'Multi Family', 'Commercial', 'Default Stories', 'Units/Bldg', 'Buildings']}
      onAdd={() => insertRow.mutate({ name: 'New Type', slug: 'new-type' })}
    >
      {data?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.name} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { name: v } })} /></TableCell>
          <TableCell><EditableCell value={row.slug} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { slug: v } })} /></TableCell>
          <TableCell><EditableCell value={row.is_single_family} type="boolean" onChange={(v) => updateRow.mutate({ id: row.id, changes: { is_single_family: v } })} /></TableCell>
          <TableCell><EditableCell value={row.is_multifamily} type="boolean" onChange={(v) => updateRow.mutate({ id: row.id, changes: { is_multifamily: v } })} /></TableCell>
          <TableCell><EditableCell value={row.is_commercial} type="boolean" onChange={(v) => updateRow.mutate({ id: row.id, changes: { is_commercial: v } })} /></TableCell>
          <TableCell><EditableCell value={row.default_stories} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { default_stories: v } })} /></TableCell>
          <TableCell><EditableCell value={row.default_units_per_building} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { default_units_per_building: v } })} /></TableCell>
          <TableCell><EditableCell value={row.default_number_of_buildings} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { default_number_of_buildings: v } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
