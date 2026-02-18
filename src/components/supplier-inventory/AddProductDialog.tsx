import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ProductFormFields, ProductFormData, EMPTY_FORM } from './ProductFormFields';
import { CatalogCategory } from '@/types/supplier';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  onSaved: () => void;
}

export function AddProductDialog({ open, onOpenChange, supplierId, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.supplier_sku.trim()) e.supplier_sku = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const { error } = await supabase.from('catalog_items').insert({
      supplier_id: supplierId,
      supplier_sku: form.supplier_sku.trim(),
      name: form.name || null,
      description: form.description.trim(),
      category: form.category as CatalogCategory,
      secondary_category: form.secondary_category || null,
      manufacturer: form.manufacturer || null,
      dimension: form.dimension || null,
      thickness: form.thickness || null,
      length: form.length || null,
      color: form.color || null,
      wood_species: form.wood_species || null,
      bundle_type: form.bundle_type || null,
      bundle_qty: form.bundle_qty ? parseInt(form.bundle_qty) : null,
      uom_default: form.uom_default,
    });

    setSaving(false);

    if (error) {
      const msg = error.message.includes('duplicate') ? 'A product with this SKU already exists.' : error.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Product added' });
      setForm({ ...EMPTY_FORM });
      setErrors({});
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <ProductFormFields form={form} onChange={setForm} errors={errors} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
