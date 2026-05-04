import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { COPricingType } from '@/types/changeOrder';

// ── Pricing Options ──────────────────────────────────
export const PRICING_OPTIONS: { type: COPricingType; title: string; description: string }[] = [
  { type: 'fixed', title: 'Fixed price', description: 'Lump sum or itemized price, approved before work.' },
  { type: 'tm', title: 'Time & material', description: 'Hours and costs logged as work happens.' },
  { type: 'nte', title: 'Not to exceed', description: 'T&M with a cap. Must notify before exceeding.' },
];

// ── Pricing Type Selector ────────────────────────────
export function PricingTypeSelector({
  pricingType,
  nteCap,
  onPricingTypeChange,
  onNteCapChange,
}: {
  pricingType: COPricingType;
  nteCap: string;
  onPricingTypeChange: (v: COPricingType) => void;
  onNteCapChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Pricing type</Label>
      <div className="space-y-2">
        {PRICING_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => onPricingTypeChange(opt.type)}
            className={cn(
              'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
              pricingType === opt.type ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
            )}
          >
            <span className={cn(
              'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
              pricingType === opt.type ? 'border-primary' : 'border-muted-foreground/40',
            )}>
              {pricingType === opt.type && <span className="w-2 h-2 rounded-full bg-primary" />}
            </span>
            <div>
              <p className="text-sm font-medium">{opt.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
      {pricingType === 'nte' && (
        <div className="space-y-1.5 pl-7">
          <Label>Maximum amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input type="number" value={nteCap} onChange={e => onNteCapChange(e.target.value)} className="pl-7" placeholder="0.00" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toggle With Party Selector ───────────────────────
export function ToggleWithSelector({
  label, hint, checked, onToggle, party, onPartyChange,
}: {
  label: string; hint: string; checked: boolean; onToggle: (v: boolean) => void;
  party: 'GC' | 'TC' | null; onPartyChange: (v: 'GC' | 'TC') => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onToggle} />
      </div>
      {checked && (
        <div className="flex gap-2 pl-4">
          {(['TC', 'GC'] as const).map(p => (
            <button
              key={p}
              onClick={() => onPartyChange(p)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                party === p ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30',
              )}
            >
              {p} responsible
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Share Toggle ─────────────────────────────────────
export function ShareToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border">
      <div>
        <p className="text-sm font-medium">{label ?? 'Share immediately'}</p>
        <p className="text-xs text-muted-foreground">If off, they cannot see this until you share it</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
