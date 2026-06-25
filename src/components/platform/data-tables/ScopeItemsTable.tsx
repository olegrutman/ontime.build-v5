import { useState } from 'react';
import { usePlatformTable } from '@/hooks/usePlatformDataTables';
import { TableRow, TableCell } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { DataTableShell } from './DataTableShell';
import { RowActions } from './RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ScopeItemsTable() {
  const { data, isLoading, updateRow, insertRow, deleteRow } = usePlatformTable('scope_items');
  const sections = usePlatformTable('scope_sections');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const sectionOptions = (sections.data as any[] | undefined)?.map((s: any) => ({ value: s.id, label: s.label })) ?? [];
  const filtered = sectionFilter === 'all' ? data : data?.filter((r: any) => r.section_id === sectionFilter);

  return (
    <DataTableShell
      title="Scope Items"
      description="Individual toggle items within each scope section."
      isLoading={isLoading}
      headers={['Label', 'Section', 'Type', 'Default On', 'Order', 'Min Stories']}
      onAdd={() => {
        const firstSection = sectionFilter !== 'all' ? sectionFilter : sectionOptions[0]?.value;
        if (!firstSection) return;
        insertRow.mutate({ label: 'New Item', section_id: firstSection, display_order: (data?.length ?? 0) + 1 });
      }}
      extra={
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sectionOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {filtered?.map((row: any) => (
        <TableRow key={row.id}>
          <TableCell><EditableCell value={row.label} type="text" onChange={(v) => updateRow.mutate({ id: row.id, changes: { label: v } })} /></TableCell>
          <TableCell>
            <EditableCell
              value={row.section_id}
              type="select"
              options={sectionOptions}
              onChange={(v) => updateRow.mutate({ id: row.id, changes: { section_id: v } })}
            />
          </TableCell>
          <TableCell>
            <EditableCell
              value={row.item_type}
              type="select"
              options={[{ value: 'STD', label: 'Standard' }, { value: 'HEADER', label: 'Header' }, { value: 'NOTE', label: 'Note' }]}
              onChange={(v) => updateRow.mutate({ id: row.id, changes: { item_type: v } })}
            />
          </TableCell>
          <TableCell><EditableCell value={row.default_on} type="boolean" onChange={(v) => updateRow.mutate({ id: row.id, changes: { default_on: v } })} /></TableCell>
          <TableCell><EditableCell value={row.display_order} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { display_order: v } })} /></TableCell>
          <TableCell><EditableCell value={row.min_stories} type="number" onChange={(v) => updateRow.mutate({ id: row.id, changes: { min_stories: v || null } })} /></TableCell>
          <TableCell><RowActions onDelete={() => deleteRow.mutate(row.id)} /></TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );
}
