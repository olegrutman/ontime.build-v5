import { Check, ChevronLeft, Pencil, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FIELD_LABELS, SECONDARY_DISPLAY_NAMES, type CatalogProduct } from '@/types/poWizardV2';
import lumberImage from '@/assets/framing-lumber-product.jpg';
const workspaceLabels: Record<string, string> = { ...FIELD_LABELS, family: 'Connection family', application: 'Application', size: 'Member size' };

export function selectionLabel(field: string, value: string) {
  if (field !== 'secondary_category') return value;
  if (value === 'Framing Lumber') return 'Dimensional Lumber & Studs';
  if (value === 'Posts & Timbers') return 'Structural Timbers & Posts';
  return SECONDARY_DISPLAY_NAMES[value] ?? value;
}

interface Props {
  category: string;
  fields: string[];
  filters: Record<string, string>;
  currentField?: string;
  secondary?: string | null;
  product?: CatalogProduct | null;
  onEdit: (field: string) => void;
  onCategories: () => void;
}

export function SelectionRail({ category, fields, filters, currentField, secondary, product, onEdit, onCategories }: Props) {
  return <aside aria-label="Your material selections" className="shrink-0 border-b md:border-b-0 md:border-r bg-muted/50 md:w-56 lg:w-60 flex flex-col">
    <div className="px-4 py-4 md:px-5 md:py-6">
      <h3 className="font-heading text-lg font-semibold uppercase break-words">{category}</h3>
      {secondary && !filters.secondary_category && <p className="text-xs text-muted-foreground mt-1 break-words">{secondary}</p>}
    </div>
    <div className="flex flex-wrap md:flex-col gap-1 px-3 pb-3 md:gap-2">
      {fields.map((field, index) => {
        const value = filters[field];
        const active = currentField === field;
        return <Button key={field} variant="ghost" disabled={!value && !active} onClick={() => onEdit(field)}
          aria-label={`Change ${workspaceLabels[field] ?? field}`}
          className={`h-auto min-h-10 md:min-h-16 justify-start gap-3 px-2 py-2 md:py-3 text-left whitespace-normal sm:whitespace-normal md:w-full ${active ? 'bg-command/10' : ''}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 text-xs ${value ? 'bg-state-approved text-command-foreground' : active ? 'bg-command text-command-foreground' : 'border text-muted-foreground'}`}>
            {value ? <Check className="!size-3.5" /> : index + 1}
          </span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{workspaceLabels[field] ?? field}</span>
            {value && <span className="block text-xs font-normal text-muted-foreground mt-1 break-words">{selectionLabel(field, value)}</span>}
          </span>
          {value && <Pencil className="!size-3 text-muted-foreground hidden md:block" />}
        </Button>;
      })}
      <div className={`hidden md:flex items-center gap-3 px-2 py-3 rounded-md ${!currentField ? 'bg-command/10' : ''}`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-command text-command-foreground text-xs shrink-0">{product ? <Check className="size-3.5" /> : fields.length + 1}</span>
        <span className="text-xs font-semibold">Product</span>
      </div>
    </div>
    <Button variant="ghost" className="mt-auto mx-3 mb-3 h-auto min-h-10 justify-start text-xs whitespace-normal" onClick={onCategories}><ChevronLeft />Back to categories</Button>
  </aside>;
}

interface ProductsProps {
  products: CatalogProduct[];
  selected: CatalogProduct | null;
  onSelect: (product: CatalogProduct) => void;
}

export function WorkspaceProducts({ products, selected, onSelect }: ProductsProps) {
  return <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-4" aria-label="Matching products">
    {products.map(product => {
      const isSelected = selected?.id === product.id;
      const isLumber = product.category === 'FramingLumber' || product.category === 'FinishLumber';
      return <Button key={product.id} variant="outline" aria-pressed={isSelected} onClick={() => onSelect(product)}
        className={`relative h-auto w-full flex-col items-stretch justify-start gap-0 overflow-hidden rounded-lg p-0 text-left whitespace-normal sm:whitespace-normal ${isSelected ? 'border-state-approved ring-1 ring-state-approved bg-state-approved/5' : 'bg-card'}`}>
        {isLumber ? <img src={lumberImage} alt="Representative framing lumber" loading="lazy" width={992} height={672} className="w-full h-32 lg:h-36 object-contain bg-background" />
          : <div className="h-20 flex items-center justify-center bg-muted/30"><Package className="!size-8 text-muted-foreground" /></div>}
        <span className={`absolute top-3 right-3 size-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-state-approved text-command-foreground' : 'bg-background border border-muted-foreground/40'}`}>
          {isSelected && <Check className="!size-3" />}
        </span>
        <span className="block p-3 space-y-1 min-w-0">
          <span className="block font-semibold text-sm leading-snug break-words">{product.name || product.description}</span>
          <span className="block font-mono text-xs text-muted-foreground break-all">SKU {product.supplier_sku}</span>
          <span className="block text-xs font-normal text-muted-foreground">{product.uom_default === 'EA' ? 'Each' : product.uom_default}{product.bundle_type && product.bundle_qty ? ` · ${product.bundle_type} (${product.bundle_qty} ${product.uom_default === 'EA' ? 'pieces' : product.uom_default})` : ''}</span>
        </span>
      </Button>;
    })}
  </div>;
}

export function SpecificationChips({ filters }: { filters: Record<string, string> }) {
  return <div className="flex flex-wrap gap-1.5" aria-label="Selected specifications">
    {Object.entries(filters).filter(([, value]) => value).map(([field, value]) => <Badge key={field} variant="secondary" className="text-[10px] font-normal bg-state-approved/10 text-foreground border-0 break-words whitespace-normal">{selectionLabel(field, value)}</Badge>)}
  </div>;
}