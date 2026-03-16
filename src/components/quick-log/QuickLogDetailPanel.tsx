import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';
import type { CatalogItem } from '@/types/quickLog';
import { MATERIAL_SPEC_OPTIONS, DEFAULT_LOCATION_CHIPS } from '@/types/quickLog';
import type { UseMutationResult } from '@tanstack/react-query';

interface QuickLogDetailPanelProps {
  item: CatalogItem | null;
  role: 'fc' | 'tc' | 'gc';
  projectId: string;
  orgId: string;
  onSuccess: () => void;
  logItem: UseMutationResult<any, Error, any>;
  inline?: boolean;
}

export function QuickLogDetailPanel({ item, role, projectId, orgId, onSuccess, logItem, inline }: QuickLogDetailPanelProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [materialSpec, setMaterialSpec] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  // Reset fields when item changes
  useEffect(() => {
    setQty('');
    setRate('');
    setMaterialSpec('');
    setLocation('');
    setNote('');
  }, [item?.id]);

  if (!item) {
    return (
      <Card className={inline ? 'border-0 shadow-none' : ''}>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Select a task from the catalog.</p>
        </CardContent>
      </Card>
    );
  }

  const isHours = item.unit === 'hr';
  const qtyNum = parseFloat(qty) || 0;
  const rateNum = parseFloat(rate) || 0;
  const lineTotal = qtyNum * rateNum;
  const canSubmit = qtyNum > 0 && rateNum > 0 && !logItem.isPending;

  const materialOptions = MATERIAL_SPEC_OPTIONS[item.category_id];

  const handleSubmit = async () => {
    try {
      await logItem.mutateAsync({
        project_id: projectId,
        org_id: orgId,
        catalog_item_id: item.id,
        item_name: item.item_name,
        division: item.division,
        category_name: item.category_name,
        unit: item.unit,
        ...(isHours ? { hours: qtyNum } : { qty: qtyNum }),
        unit_rate: rateNum,
        material_spec: materialSpec || undefined,
        location: location || undefined,
        note: note || undefined,
      });
      toast({ title: `Logged: ${item.item_name} ✓` });
      setQty('');
      setRate('');
      setMaterialSpec('');
      setLocation('');
      setNote('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Failed to log', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card className={inline ? 'border-0 shadow-none' : ''}>
      <CardContent className={inline ? 'p-0 space-y-4' : 'p-4 space-y-4'}>
        {/* Header strip */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
            style={{ backgroundColor: item.category_bg || '#F9FAFB', color: item.category_color || '#6B7280' }}
          >
            {item.category_icon || '•'}
          </span>
          <div>
            <p className="font-semibold text-sm">{item.item_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.unit}</p>
          </div>
        </div>

        {/* Qty / Hours */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {isHours ? 'Hours' : `Quantity (${item.unit})`}
          </label>
          <Input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={isHours ? '0' : '0'}
            className="min-h-[48px] text-base"
          />
        </div>

        {/* Rate — always empty, required */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Your rate $
          </label>
          <Input
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="min-h-[48px] text-base"
          />
        </div>

        {/* Material/spec dropdown */}
        {materialOptions && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Material / Spec
            </label>
            <Select value={materialSpec} onValueChange={setMaterialSpec}>
              <SelectTrigger><SelectValue placeholder="Select material…" /></SelectTrigger>
              <SelectContent>
                {materialOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location chips */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Location
          </label>
          <div className="flex flex-wrap gap-1.5 lg:flex-wrap overflow-x-auto">
            {DEFAULT_LOCATION_CHIPS.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(location === loc ? '' : loc)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  location === loc
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700'
                    : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick note…"
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Line total preview */}
        {qtyNum > 0 && rateNum > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-center">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {qtyNum} × ${rateNum.toFixed(2)} = ${lineTotal.toFixed(2)}
            </span>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full min-h-[48px] text-base font-bold"
          size="lg"
        >
          {logItem.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          {role === 'gc' ? 'Send Request' : 'Log Work Done'}
        </Button>
      </CardContent>
    </Card>
  );
}
