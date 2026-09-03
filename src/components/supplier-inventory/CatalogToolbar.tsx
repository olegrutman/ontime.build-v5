import { Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATALOG_CATEGORIES, CATEGORY_LABELS } from '@/types/supplier';
import type { CatalogFilters } from '@/hooks/useCatalogManager';

interface Props {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  manufacturers: string[];
  onExport: () => void;
  exporting?: boolean;
}

export function CatalogToolbar({ filters, onChange, manufacturers, onExport, exporting }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SKU, name, description, manufacturer…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value, page: 0 })}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Select value={filters.category} onValueChange={(v) => onChange({ category: v, page: 0 })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATALOG_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.manufacturer} onValueChange={(v) => onChange({ manufacturer: v, page: 0 })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Manufacturer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All manufacturers</SelectItem>
            {manufacturers.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => onChange({ status: v as CatalogFilters['status'], page: 0 })}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Retired only</SelectItem>
            <SelectItem value="unpriced">Missing price</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export
        </Button>
      </div>
    </div>
  );
}
