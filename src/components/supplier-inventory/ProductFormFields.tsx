import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATALOG_CATEGORIES, CATEGORY_LABELS, UOM_OPTIONS, CatalogCategory } from '@/types/supplier';

export interface ProductFormData {
  supplier_sku: string;
  name: string;
  description: string;
  category: CatalogCategory;
  secondary_category: string;
  manufacturer: string;
  dimension: string;
  thickness: string;
  length: string;
  color: string;
  wood_species: string;
  bundle_type: string;
  bundle_qty: string;
  uom_default: string;
}

export const EMPTY_FORM: ProductFormData = {
  supplier_sku: '',
  name: '',
  description: '',
  category: 'Other',
  secondary_category: '',
  manufacturer: '',
  dimension: '',
  thickness: '',
  length: '',
  color: '',
  wood_species: '',
  bundle_type: '',
  bundle_qty: '',
  uom_default: 'EA',
};

interface Props {
  form: ProductFormData;
  onChange: (form: ProductFormData) => void;
  errors: Record<string, string>;
  skuDisabled?: boolean;
}

export function ProductFormFields({ form, onChange, errors, skuDisabled }: Props) {
  const set = (field: keyof ProductFormData, value: string) =>
    onChange({ ...form, [field]: value });

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {/* Required fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">SKU *</label>
          <Input
            value={form.supplier_sku}
            onChange={(e) => set('supplier_sku', e.target.value)}
            placeholder="ABC-123"
            className="font-mono"
            disabled={skuDisabled}
          />
          {errors.supplier_sku && <p className="text-xs text-destructive mt-1">{errors.supplier_sku}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">UOM *</label>
          <Select value={form.uom_default} onValueChange={(v) => set('uom_default', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UOM_OPTIONS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Name</label>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Product name" />
      </div>

      <div>
        <label className="text-sm font-medium">Description *</label>
        <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Product description" />
        {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Category *</label>
          <Select value={form.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATALOG_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Sub-Category</label>
          <Input value={form.secondary_category} onChange={(e) => set('secondary_category', e.target.value)} placeholder="e.g. Studs" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Manufacturer</label>
        <Input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} placeholder="e.g. Simpson" />
      </div>

      {/* Specs */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Dimension</label>
          <Input value={form.dimension} onChange={(e) => set('dimension', e.target.value)} placeholder="2x4" />
        </div>
        <div>
          <label className="text-sm font-medium">Thickness</label>
          <Input value={form.thickness} onChange={(e) => set('thickness', e.target.value)} placeholder='1/2"' />
        </div>
        <div>
          <label className="text-sm font-medium">Length</label>
          <Input value={form.length} onChange={(e) => set('length', e.target.value)} placeholder="8'" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Color</label>
          <Input value={form.color} onChange={(e) => set('color', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Wood Species</label>
          <Input value={form.wood_species} onChange={(e) => set('wood_species', e.target.value)} placeholder="e.g. SPF" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Bundle Type</label>
          <Input value={form.bundle_type} onChange={(e) => set('bundle_type', e.target.value)} placeholder="e.g. Unit" />
        </div>
        <div>
          <label className="text-sm font-medium">Bundle Qty</label>
          <Input type="number" value={form.bundle_qty} onChange={(e) => set('bundle_qty', e.target.value)} placeholder="0" />
        </div>
      </div>
    </div>
  );
}
