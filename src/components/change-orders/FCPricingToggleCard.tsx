import { useState } from 'react';
import { ElongatedSwitch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { HandCoins, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { canChangeCrewPricingBase } from '@/lib/fcPricingBase';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';

interface FCPricingToggleCardProps {
  co: ChangeOrder;
  financials: COFinancials;
  myOrgId: string;
  onRefresh: () => void;
  fcCollabName: string;
  gcSideName: string;
}

export function FCPricingToggleCard({
  co,
  myOrgId,
  onRefresh,
  fcCollabName,
  gcSideName,
}: FCPricingToggleCardProps) {
  const [toggling, setToggling] = useState(false);

  const isOn = co.use_fc_pricing_base ?? false;
  const editable = canChangeCrewPricingBase(co, myOrgId);

  const helper = !editable
    ? `Locked while this order is with ${gcSideName}. Recall it to change billing.`
    : isOn
      ? `Billing follows what ${fcCollabName} logged. Their charges stay private.`
      : 'You set your own prices. Crew charges stay private.';

  async function handleToggle(checked: boolean) {
    setToggling(true);
    try {
      const { error } = await supabase.rpc('set_crew_pricing_base', {
        _co_id: co.id, _enabled: checked, _org_id: myOrgId,
      });
      if (error) throw error;
      onRefresh();
      toast.success(checked ? 'Crew pricing base enabled' : 'Crew-derived billing cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change pricing base');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 transition-colors',
        isOn
          ? 'border-primary/50 bg-primary/10'
          : 'border-dashed border-border bg-muted/40',
      )}
      title={editable ? 'Applies to every scope item. Manual prices and crew charges are kept.' : undefined}
    >
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isOn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        <HandCoins className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <label
          htmlFor="fc-pricing-toggle"
          className="block text-sm font-semibold leading-tight text-foreground"
        >
          Price from {fcCollabName} input
        </label>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{helper}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {!editable && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            Locked
          </span>
        )}
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap',
            isOn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {isOn ? 'Crew prices' : 'My prices'}
        </span>
        <ElongatedSwitch
          id="fc-pricing-toggle"
          checked={isOn}
          onCheckedChange={handleToggle}
          disabled={toggling || !editable}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
