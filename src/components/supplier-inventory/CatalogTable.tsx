import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { CatalogManagerItem } from '@/hooks/useCatalogManager';

interface Props {
  rows: CatalogManagerItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (item: CatalogManagerItem) => void;
  onPriceCommit: (item: CatalogManagerItem, price: number | null) => void;
}

function PriceCell({
  item,
  onCommit,
}: {
  item: CatalogManagerItem;
  onCommit: (price: number | null) => void;
}) {
  const [value, setValue] = useState(item.list_price != null ? String(item.list_price) : '');
  const [dirty, setDirty] = useState(false);

  const commit = () => {
    if (!dirty) return;
    setDirty(false);
    const trimmed = value.trim();
    if (trimmed === '') return onCommit(null);
    const num = Number(trimmed);
    if (Number.isNaN(num) || num < 0) {
      setValue(item.list_price != null ? String(item.list_price) : '');
      return;
    }
    onCommit(num);
  };

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        inputMode="decimal"
        className="h-8 w-24 font-mono text-right"
      />
      <span className="text-[0.65rem] text-muted-foreground">/{item.price_uom || item.uom_default}</span>
    </div>
  );
}

export function CatalogTable({ rows, selectedIds, onToggle, onToggleAll, onEdit, onPriceCommit }: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead className="text-right">List price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEdit(item)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggle(item.id)}
                    aria-label={`Select ${item.supplier_sku}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{item.supplier_sku}</TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{item.name || item.description}</p>
                  {item.manufacturer && (
                    <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={item.category === 'Other' ? 'outline' : 'secondary'}>{item.category}</Badge>
                    {item.secondary_category && (
                      <span className="text-[0.65rem] text-muted-foreground">{item.secondary_category}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                  {[item.dimension, item.thickness, item.length, item.color, item.wood_species]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.uom_default}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <PriceCell item={item} onCommit={(p) => onPriceCommit(item, p)} />
                  </div>
                </TableCell>
                <TableCell>
                  {item.is_active ? (
                    <Badge variant="secondary" className="text-[0.6rem]">ACTIVE</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[0.6rem] text-muted-foreground">RETIRED</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-border">
        {rows.map((item) => (
          <div key={item.id} className="p-3 flex gap-3">
            <Checkbox
              checked={selectedIds.has(item.id)}
              onCheckedChange={() => onToggle(item.id)}
              className="mt-1"
              aria-label={`Select ${item.supplier_sku}`}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[0.68rem] text-muted-foreground">{item.supplier_sku}</p>
                  <p className="text-sm font-medium break-words">{item.name || item.description}</p>
                </div>
                {!item.is_active && (
                  <Badge variant="outline" className="text-[0.55rem] flex-shrink-0">RETIRED</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={item.category === 'Other' ? 'outline' : 'secondary'} className="text-[0.6rem]">
                  {item.category}
                </Badge>
                <span className="font-mono text-[0.68rem] text-muted-foreground">{item.uom_default}</span>
                <span className="font-mono text-[0.75rem] font-bold ml-auto">
                  {item.list_price != null ? formatCurrency(item.list_price) : 'No price'}
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => onEdit(item)}>
                Edit product
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
