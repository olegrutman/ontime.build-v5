import { useMemo, useState } from 'react';
import { Check, Loader2, Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractMaterial, catalogDimensions, catalogLengthFt } from '@/lib/fieldMaterialExtract';
import { FieldMaterialPicker, loadSuppliers } from './FieldMaterialPicker';

const db = supabase as any;
type Product = { id: string; supplier_id: string; supplier_sku: string; name: string; description: string | null; length: string | null; wood_species: string | null; uom_default: string };

/** Free-text material note → choose in picker, or let AI pull the specs and guide the catalog pick. */
export function FieldMaterialMatch({ report, item, onSaved }: { report: any; item: any; onSaved: () => void }) {
  const { toast } = useToast();
  const facts = useMemo(() => extractMaterial(item.description), [item.description]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [length, setLength] = useState<number | null>(facts.lengthFt);
  const [picked, setPicked] = useState<Product | null>(null);
  const [qty, setQty] = useState(facts.quantity ? String(facts.quantity) : item.quantity ? String(item.quantity) : '');
  const [saving, setSaving] = useState(false);

  const find = async () => {
    setOpen(true); setLoading(true); setPicked(null); setLength(facts.lengthFt);
    try {
      const list = await loadSuppliers(report.project_id);
      setSuppliers(Object.fromEntries(list.map(s => [s.id, s.name])));
      const ids = list.map(s => s.id);
      if (!ids.length) { setProducts([]); return; }
      let q = db.from('catalog_items').select('id,supplier_id,supplier_sku,name,description,length,wood_species,uom_default').eq('is_active', true).in('supplier_id', ids).limit(200);
      const dims = catalogDimensions(facts);
      if (dims.length) q = q.eq('category', 'FramingLumber').in('dimension', dims);
      else if (facts.keywords.length) for (const k of facts.keywords.slice(0, 4)) q = q.ilike('normalized_search', `%${k}%`);
      else { setProducts([]); return; }
      const { data, error } = await q;
      if (error) throw error;
      // Prefer the project's own supplier catalog over the fallback catalog.
      const rows = (data || []) as Product[];
      setProducts(rows.sort((a, b) => ids.indexOf(a.supplier_id) - ids.indexOf(b.supplier_id) || (catalogLengthFt(a.length) ?? 0) - (catalogLengthFt(b.length) ?? 0)));
    } catch (e: any) {
      toast({ title: 'Could not search the catalog', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const lengths = useMemo(() => [...new Set(products.map(p => catalogLengthFt(p.length)).filter((n): n is number => n != null))].sort((a, b) => a - b), [products]);
  const needsLength = catalogDimensions(facts).length > 0 && lengths.length > 1;
  const shown = needsLength ? (length != null ? products.filter(p => catalogLengthFt(p.length) === length) : []) : products;

  const only = shown.length === 1 ? shown[0] : null;
  if (only && !picked) setTimeout(() => setPicked(only), 0);

  const save = async () => {
    if (!picked || !(Number(qty) > 0)) return;
    setSaving(true);
    const { error } = await db.from('field_report_items').update({
      description: picked.name, quantity: Number(qty), unit: picked.uom_default,
      catalog_item_id: picked.id, supplier_id: picked.supplier_id, ai_generated: false,
      material_context: { source: 'daily_report_ai_match', catalog_item_id: picked.id, sku: picked.supplier_sku, unit_mode: 'EACH', is_engineered: false },
    }).eq('id', item.id).eq('status', 'draft');
    setSaving(false);
    if (error) { toast({ title: 'Could not add the product', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Catalog product added to report', description: 'Your reviewing company will create and send the order.' });
    setOpen(false); onSaved();
  };

  const chip = (label: string, value: string | null) => <span className={`rounded-md border px-2 py-1 text-xs ${value ? 'border-border bg-card' : 'border-dashed text-muted-foreground'}`}>{label}: <span className="font-mono font-semibold">{value || 'not said'}</span></span>;

  return <>
    <div className="w-full rounded-lg border border-type-sov/30 bg-type-sov/5 p-3 space-y-2">
      <p className="text-xs font-medium">This sounds like a material order. Order an exact catalog product?</p>
      <div className="flex flex-wrap gap-2">
        <FieldMaterialPicker report={report} replaceItemId={item.id} onSaved={onSaved} />
        <Button size="sm" variant="outline" onClick={find}><Sparkles />Let AI find it</Button>
      </div>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-xl uppercase">Find in catalog</DialogTitle>
          <DialogDescription className="break-words text-xs">From: “{item.description}”. Only what was said is used—pick anything missing.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">{chip('Size', facts.nominal)}{chip('Length', length != null ? `${length} ft` : null)}{chip('Qty', qty || null)}</div>
        {loading ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Searching project catalogs…</p> : <div className="space-y-3">
          {needsLength && <div className="space-y-1.5"><p className="text-xs font-semibold uppercase text-muted-foreground">{facts.lengthFt != null && !lengths.includes(facts.lengthFt) ? `${facts.lengthFt} ft isn't stocked — choose a length` : 'Choose a length'}</p><div className="flex flex-wrap gap-1.5">{lengths.map(l => <Button key={l} size="sm" variant={length === l ? 'default' : 'outline'} onClick={() => { setLength(l); setPicked(null); }}>{l} ft</Button>)}</div></div>}
          {(!needsLength || length != null) && <div className="space-y-1.5"><p className="text-xs font-semibold uppercase text-muted-foreground">{shown.length === 1 ? 'Matching product' : shown.length ? `Choose one of ${shown.length} products` : 'No matching product'}</p>
            {shown.slice(0, 30).map(p => <button key={p.id} type="button" onClick={() => setPicked(p)} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${picked?.id === p.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{p.name}</span><span className="block break-words font-mono text-[11px] text-muted-foreground">SKU {p.supplier_sku} · {suppliers[p.supplier_id] || 'Catalog'}</span></span>{picked?.id === p.id && <Check className="shrink-0 text-primary" size={18} />}</button>)}
            {!shown.length && <p className="text-xs text-muted-foreground">Nothing in the project catalogs matches what was said. Use Choose materials to browse.</p>}
          </div>}
          {picked && <div className="space-y-1"><Label htmlFor={`qty-${item.id}`} className="text-xs">Quantity ({picked.uom_default})</Label><Input id={`qty-${item.id}`} type="number" inputMode="numeric" min={1} value={qty} onChange={e => setQty(e.target.value)} placeholder="How many?" /></div>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}><Search />Cancel</Button>
            <Button disabled={!picked || !(Number(qty) > 0) || saving} onClick={save}>{saving && <Loader2 className="animate-spin" />}Add to report</Button>
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
