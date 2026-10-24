import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
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
    <div className="flex items-center gap-3 min-w-0" title={editable ? 'Applies to all scope items. Manual prices and crew charges are kept.' : `Recall the submission to ${gcSideName} before changing billing.`}>
          <label htmlFor="fc-pricing-toggle" className="text-xs font-medium text-foreground leading-tight min-w-0">
            Price from {fcCollabName} input
          </label>
          <Switch
            id="fc-pricing-toggle"
            checked={isOn}
            onCheckedChange={handleToggle}
            disabled={toggling || !editable}
            className="shrink-0"
          />
    </div>
  );
}
