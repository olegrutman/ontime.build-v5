import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { ProductFormFields, ProductFormData, EMPTY_FORM } from './ProductFormFields';
import { CatalogCategory } from '@/types/supplier';

interface CatalogItem {
  id: string;
  supplier_sku: string;
  name: string | null;
  description: string;
  category: string;
  secondary_category: string | null;
  manufacturer: string | null;
  dimension: string | null;
  thickness: string | null;
  length: string | null;
  color: string | null;
  wood_species: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  uom_default: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem | null;
  onSaved: () => void;
}

export function EditProductDialog({ open, onOpenChange, item, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        supplier_sku: item.supplier_sku,
        name: item.name || '',
        description: item.description,
        category: (item.category as CatalogCategory) || 'Other',
        secondary_category: item.secondary_category || '',
        manufacturer: item.manufacturer || '',
        dimension: item.dimension || '',
        thickness: item.thickness || '',
        length: item.length || '',
        color: item.color || '',
        wood_species: item.wood_species || '',
        bundle_type: item.bundle_type || '',
        bundle_qty: item.bundle_qty?.toString() || '',
        uom_default: item.uom_default || 'EA',
      });
      setErrors({});
    }
  }, [item]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!item || !validate()) return;
    setSaving(true);

    const { error } = await supabase.from('catalog_items').update({
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
    }).eq('id', item.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Product updated' });
      onOpenChange(false);
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(true);

    const { error } = await supabase.from('catalog_items').delete().eq('id', item.id);
    setDeleting(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Product deleted' });
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <ProductFormFields form={form} onChange={setForm} errors={errors} skuDisabled />
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="sm:mr-auto">
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
