import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HandCoins, Loader2, Lock } from 'lucide-react';
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

const OPTIONS = [
  { value: true, label: 'Crew prices' },
  { value: false, label: 'My prices' },
] as const;

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
        'rounded-xl border px-3 py-2.5 transition-colors',
        isOn ? 'border-primary bg-primary/10' : 'border-border bg-muted/50',
      )}
      title={editable ? 'Applies to every scope item. Manual prices and crew charges are kept.' : undefined}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              isOn ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground',
            )}
            aria-hidden
          >
            <HandCoins className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-foreground">
              Who sets the price?
              {toggling && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {toggling ? 'Updating prices…' : helper}
            </p>
          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!editable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
          <div
            role="group"
            aria-label="Who sets the price"
            data-testid="crew-pricing-base"
            className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 sm:flex sm:w-auto"
          >
            {OPTIONS.map(option => {
              const active = isOn === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  disabled={!editable || toggling}
                  onClick={() => !active && void handleToggle(option.value)}
                  className={cn(
                    'min-w-[92px] whitespace-nowrap rounded-md px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    !editable && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {toggling && !active ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : option.label}

                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
