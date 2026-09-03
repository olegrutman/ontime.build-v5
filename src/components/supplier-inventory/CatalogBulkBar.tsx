import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATALOG_CATEGORIES, CATEGORY_LABELS, UOM_OPTIONS, CatalogCategory } from '@/types/supplier';

interface Props {
  count: number;
  saving: boolean;
  onClear: () => void;
  onSetCategory: (category: CatalogCategory) => void;
  onSetUom: (uom: string) => void;
  onSetPrice: (price: number | null, uom: string) => void;
  onSetActive: (active: boolean) => void;
}

export function CatalogBulkBar({
  count,
  saving,
  onClear,
  onSetCategory,
  onSetUom,
  onSetPrice,
  onSetActive,
}: Props) {
  const [price, setPrice] = useState('');
  const [priceUom, setPriceUom] = useState('EA');

  return (
    <div className="sticky bottom-20 sm:bottom-4 z-30 bg-card border border-primary/40 rounded-2xl shadow-lg px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 mr-auto">
          <span className="font-mono text-sm font-bold text-primary">{count}</span>
          <span className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">selected</span>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <Select onValueChange={(v) => onSetCategory(v as CatalogCategory)}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Set category" /></SelectTrigger>
          <SelectContent>
            {CATALOG_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={onSetUom}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Set UOM" /></SelectTrigger>
          <SelectContent>
            {UOM_OPTIONS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            inputMode="decimal"
            className="w-24 h-9 font-mono"
          />
          <Select value={priceUom} onValueChange={setPriceUom}>
            <SelectTrigger className="w-[80px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UOM_OPTIONS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9"
            disabled={!price.trim() || Number.isNaN(Number(price))}
            onClick={() => {
              onSetPrice(Number(price), priceUom);
              setPrice('');
            }}
          >
            Apply price
          </Button>
        </div>

        <Button size="sm" variant="outline" className="h-9" onClick={() => onSetActive(true)}>
          Activate
        </Button>
        <Button size="sm" variant="outline" className="h-9" onClick={() => onSetActive(false)}>
          Retire
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
