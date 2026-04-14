import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  financials,
  myOrgId,
  onRefresh,
  fcCollabName,
  gcSideName,
}: FCPricingToggleCardProps) {
  const { updateCO } = useChangeOrders(co.project_id);
  const [toggling, setToggling] = useState(false);

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings-pricing', myOrgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('org_settings')
        .select('default_hourly_rate, labor_markup_percent, use_fc_input_as_base')
        .eq('organization_id', myOrgId)
        .maybeSingle();
      return data;
    },
    enabled: !!myOrgId,
  });

  const isOn = co.use_fc_pricing_base ?? false;
  const rate = orgSettings?.default_hourly_rate ?? 0;
  const markup = orgSettings?.labor_markup_percent ?? 0;

  const isHourly = co.pricing_type === 'tm' || co.pricing_type === 'nte';
  const fcHours = financials.fcTotalHours;
  const fcLumpSum = financials.fcLumpSumTotal;
  const fcHasSubmitted = isHourly ? fcHours > 0 : fcLumpSum > 0;

  const calculatedPrice = isHourly
    ? fcHours * rate
    : fcLumpSum * (1 + markup / 100);

  const lastWrittenPrice = useRef<number | null>(null);

  useEffect(() => {
    if (!isOn || !fcHasSubmitted || calculatedPrice <= 0) return;
    if (lastWrittenPrice.current === calculatedPrice) return;
    lastWrittenPrice.current = calculatedPrice;
    supabase
      .from('change_orders')
      .update({ tc_submitted_price: calculatedPrice, updated_at: new Date().toISOString() })
      .eq('id', co.id)
      .then(({ error }) => {
        if (error) console.error('Failed to persist FC pricing base price', error);
        else onRefresh();
      });
  }, [isOn, fcHasSubmitted, calculatedPrice, co.id, onRefresh]);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    try {
      const updates: Record<string, any> = { use_fc_pricing_base: checked };
      if (!checked) updates.tc_submitted_price = null;
      await updateCO.mutateAsync({ id: co.id, updates });
      onRefresh();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="co-light-shell overflow-hidden">
      <div className="px-4 py-3 border-b border-border co-light-header">
        <h3 className="text-sm font-semibold text-foreground">{fcCollabName} Pricing Base</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="fc-pricing-toggle" className="text-xs text-muted-foreground leading-tight">
            Use {fcCollabName} input as my pricing base
          </label>
          <Switch
            id="fc-pricing-toggle"
            checked={isOn}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>

        {isOn && fcHasSubmitted && (
          <div className="space-y-1.5 pt-1">
            {isHourly ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{fcCollabName} hours</span>
                  <span className="font-medium text-foreground">{fcHours} hrs</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your rate</span>
                  <span className="font-medium text-foreground">${rate.toFixed(2)}/hr</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{fcCollabName} lump sum</span>
                  <span className="font-medium text-foreground">{fmtCurrency(fcLumpSum)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your markup</span>
                  <span className="font-medium text-foreground">{markup}%</span>
                </div>
              </>
            )}
            <div className="border-t border-border pt-1.5 mt-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Price to {gcSideName}</span>
                <span className="font-semibold text-foreground">{fmtCurrency(calculatedPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {isOn && !fcHasSubmitted && (
          <p className="text-[11px] text-muted-foreground">
            {fcCollabName} has not submitted pricing yet. The calculated price will appear once they submit.
          </p>
        )}

        {!isOn && (
          <p className="text-[11px] text-muted-foreground">
            Only your own logged hours will be used for pricing to {gcSideName}. Toggle on to use {fcCollabName}'s hours × your rate instead.
          </p>
        )}
      </div>
    </div>
  );
}
