import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { ChevronRight, Layers, Anchor, Hammer, Link, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogProduct } from '@/types/poWizardV2';
import { advanceHardware, classifyHardware, filterHardware, HARDWARE_FIELDS, hardwareOptions, type HardwareCandidate, type HardwareSelection } from '@/lib/hardwareFunnel';

export interface HardwarePickerHandle { goBack: () => void }
interface Props { supplierId: string | null; onSelect: (product: CatalogProduct) => void; onBack: () => void }
const headings = ['What are you connecting?', 'Application / mount style', 'Member / hardware size'];
const icons = [Layers, Package, Link, Wrench, Anchor, Hammer];

export const HardwarePicker = forwardRef<HardwarePickerHandle, Props>(function HardwarePicker({ supplierId, onSelect, onBack }, ref) {
  const [rows, setRows] = useState<HardwareCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ selection: HardwareSelection; index: number }>({ selection: {}, index: 0 });
  const [history, setHistory] = useState<typeof state[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!supplierId) return;
    setLoading(true); setFailed(false);
    void (async () => {
      try {
        const all: CatalogProduct[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('catalog_items').select('*')
            .eq('supplier_id', supplierId).eq('category', 'Hardware').eq('is_active', true)
            .order('id').range(offset, offset + 499);
          if (error) throw error;
          if (cancelled) return;
          const batch = (data ?? []) as unknown as CatalogProduct[];
          all.push(...batch);
          if (batch.length < 500) break;
        }
        const candidates = all.map(classifyHardware);
        setRows(candidates); setState(advanceHardware(candidates, {}, 0)); setHistory([]);
      } catch { if (!cancelled) setFailed(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [supplierId, retry]);

  useImperativeHandle(ref, () => ({ goBack: () => {
    const previous = history.at(-1);
    if (!previous) { onBack(); return; }
    setState(previous); setHistory(history.slice(0, -1));
  } }), [history, onBack]);
  const candidates = useMemo(() => filterHardware(rows, state.selection), [rows, state.selection]);
  const field = HARDWARE_FIELDS[state.index];
  const options = field ? hardwareOptions(candidates, field) : [];

  if (loading) return <div className="p-4 space-y-2">{[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-16 rounded-xl" />)}</div>;
  if (failed) return <div className="p-4 space-y-3"><p className="text-sm text-muted-foreground">Hardware could not be loaded.</p><Button variant="outline" onClick={() => setRetry(retry + 1)}>Try again</Button></div>;
  return <div className="p-4 space-y-3">
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {Object.values(state.selection).map((value, i) => <span key={i} className="break-words">{i > 0 && ' › '}{value}</span>)}
    </div>
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-semibold text-sm">{headings[state.index] ?? 'Pick model & finish'}</h3>
      <span className="text-xs text-muted-foreground shrink-0">{state.index + 1} / 5</span>
    </div>
    {field ? <div className="grid gap-2">
      {options.map(({ value, count }, i) => {
        const Icon = icons[i % icons.length];
        return <Button key={value} variant="outline" className="h-auto min-h-16 w-full justify-start gap-3 whitespace-normal text-left py-3"
          onClick={() => { setHistory([...history, state]); setState(advanceHardware(rows, { ...state.selection, [field]: value }, state.index + 1)); }}>
          {field === 'family' && <Icon className="h-5 w-5 text-primary shrink-0" />}
          <span className="flex-1 min-w-0 break-words">{value}</span>
          <span className="text-xs text-muted-foreground shrink-0">{count}</span><ChevronRight className="h-4 w-4 shrink-0" />
        </Button>;
      })}
    </div> : <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{candidates.length} matching products</p>
      {candidates.map(({ product }) => <Button key={product.id} variant="outline" className="h-auto w-full justify-start gap-2 whitespace-normal text-left py-3" onClick={() => onSelect(product)}>
        <span className="flex-1 min-w-0 space-y-1">
          <span className="block font-medium break-words">{product.name ?? product.description}</span>
          <span className="block text-xs text-muted-foreground break-words">{product.supplier_sku}{product.finish ? ` · ${product.finish}` : ''}</span>
          <span className="block text-xs text-muted-foreground break-words">{product.description}</span>
        </span><ChevronRight className="h-4 w-4 shrink-0" />
      </Button>)}
      {candidates.length === 0 && <p className="text-sm text-muted-foreground">No hardware available.</p>}
    </div>}
  </div>;
});