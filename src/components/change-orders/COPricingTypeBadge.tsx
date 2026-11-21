import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CO_PRICING_PRESENTATION } from '@/lib/coPricingPresentation';
import type { COPricingType } from '@/types/changeOrder';

const PRICING_CLASSES: Record<COPricingType, string> = {
  fixed: 'border-state-approved/30 bg-state-approved/10 text-state-approved',
  tm: 'border-type-sov/30 bg-type-sov/10 text-type-sov',
  nte: 'border-state-open/30 bg-state-open/10 text-state-open',
};

export function COPricingTypeBadge({ pricingType }: { pricingType: COPricingType }) {
  const label = CO_PRICING_PRESENTATION[pricingType].listLabel;

  return (
    <Badge
      variant="outline"
      className={cn('h-5 px-2 py-0 text-[10px] font-semibold', PRICING_CLASSES[pricingType])}
      aria-label={`Pricing: ${label}`}
    >
      {label}
    </Badge>
  );
}
