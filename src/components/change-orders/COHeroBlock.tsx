import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';

type CardVariant = 'primary' | 'secondary' | 'green' | 'red';

interface HeroCard {
  variant: CardVariant;
  icon: string;
  title: string;
  description: string;
  amount?: string;
  fullWidth?: boolean;
  action: string; // action key for parent to handle
}

interface COHeroBlockProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  fcCollabName: string;
  onAction: (action: string) => void;
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getCards(props: COHeroBlockProps): { eyebrow: string; headline: string; hint: string; cards: HeroCard[] } {
  const { co, isGC, isTC, isFC, financials, fcCollabName } = props;
  const status = co.status;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    if (status === 'submitted') {
      return {
        eyebrow: 'APPROVAL REQUIRED',
        headline: 'REVIEW & APPROVE',
        hint: 'TC submitted this CO for your approval',
        cards: [
          { variant: 'green', icon: '✅', title: 'Approve this CO', description: 'Accept pricing and authorize work', amount: fmtCurrency(totalToApprove), fullWidth: true, action: 'approve' },
          { variant: 'secondary', icon: '✕', title: 'Reject with note', description: 'Send back with feedback', action: 'reject' },
          { variant: 'secondary', icon: '📊', title: 'Budget impact', description: 'See how this affects the project', action: 'budget_impact' },
        ],
      };
    }
    if (status === 'work_in_progress') {
      return {
        eyebrow: 'WORK IN PROGRESS',
        headline: 'MANAGE THIS CO',
        hint: 'Work is underway — waiting on contractor pricing',
        cards: [
          { variant: 'secondary', icon: '🔒', title: 'Close for pricing', description: 'Lock scope for final pricing', action: 'close_for_pricing' },
          { variant: 'secondary', icon: '📊', title: 'Review running cost', description: 'Current labor and materials', action: 'scroll_pricing' },
          { variant: 'secondary', icon: '👷', title: 'FC involvement', description: 'Field crew status', action: 'scroll_fc' },
          { variant: 'secondary', icon: '📋', title: 'View scope', description: 'Line items and details', action: 'scroll_scope' },
        ],
      };
    }
    return {
      eyebrow: co.status.toUpperCase().replace(/_/g, ' '),
      headline: 'CHANGE ORDER',
      hint: 'Review the details below',
      cards: [
        { variant: 'secondary', icon: '📊', title: 'Review cost', description: 'Financial breakdown', action: 'scroll_pricing' },
        { variant: 'secondary', icon: '📋', title: 'View scope', description: 'Line items and details', action: 'scroll_scope' },
      ],
    };
  }

  if (isTC) {
    if (status === 'closed_for_pricing') {
      return {
        eyebrow: 'CLOSED FOR PRICING',
        headline: 'PRICE & SUBMIT',
        hint: 'Finalize your pricing and submit to GC',
        cards: [
          { variant: 'primary', icon: '🚀', title: 'Submit to GC', description: 'Send your final price for approval', amount: fmtCurrency(financials.grandTotal), fullWidth: true, action: 'submit' },
          { variant: 'secondary', icon: '⚡', title: 'Use FC base pricing', description: `Apply ${fcCollabName} hours as base`, action: 'use_fc_base' },
          { variant: 'secondary', icon: '📦', title: 'Add materials', description: 'Include material costs', action: 'scroll_materials' },
        ],
      };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      return {
        eyebrow: 'WORK IN PROGRESS',
        headline: 'BUILD YOUR PRICE',
        hint: 'Add labor, materials, then close for pricing',
        cards: [
          { variant: 'primary', icon: '⚒', title: 'Request hours from FC', description: `Ask ${fcCollabName} to log hours`, action: 'request_fc' },
          { variant: 'secondary', icon: '🔒', title: 'Close for pricing', description: 'Lock scope for final price', action: 'close_for_pricing' },
          { variant: 'secondary', icon: '📦', title: 'Add materials', description: 'Include material costs', action: 'scroll_materials' },
          { variant: 'secondary', icon: '📋', title: 'Review scope', description: 'View line items', action: 'scroll_scope' },
        ],
      };
    }
    return {
      eyebrow: co.status.toUpperCase().replace(/_/g, ' '),
      headline: 'CHANGE ORDER',
      hint: status === 'submitted' ? 'Waiting on GC approval' : 'Review the details below',
      cards: [
        { variant: 'secondary', icon: '📊', title: 'Review pricing', description: 'Financial breakdown', action: 'scroll_pricing' },
        { variant: 'secondary', icon: '📋', title: 'View scope', description: 'Line items and details', action: 'scroll_scope' },
      ],
    };
  }

  // FC
  return {
    eyebrow: 'YOUR TASKS',
    headline: 'WHAT DO YOU NEED?',
    hint: 'Log hours or report issues',
    cards: [
      { variant: 'primary', icon: '⏱', title: 'Log my hours', description: 'Add time to this CO', action: 'log_hours' },
      { variant: 'secondary', icon: '🚀', title: 'Submit to TC', description: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs ready` : 'No hours yet', action: 'submit_to_tc' },
      { variant: 'secondary', icon: '📦', title: 'Need material', description: 'Request materials', action: 'need_material' },
      { variant: 'red', icon: '⚠️', title: 'Saw damage', description: 'Report damage by others', action: 'saw_damage' },
    ],
  };
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  primary: 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))]',
  secondary: 'bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.1]',
  green: 'bg-emerald-500/[0.15] text-white border border-emerald-400/20 hover:bg-emerald-500/[0.25]',
  red: 'bg-red-500/[0.15] text-white border border-red-400/20 hover:bg-red-500/[0.25]',
};

export function COHeroBlock(props: COHeroBlockProps) {
  const { eyebrow, headline, hint, cards } = getCards(props);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="px-4 pt-5 pb-2">
        <p className="text-[0.6rem] uppercase tracking-[0.1em] font-medium" style={{ color: 'hsl(220 27% 70%)' }}>
          {eyebrow}
        </p>
        <h2
          className="text-lg font-extrabold uppercase tracking-wide mt-0.5"
          className="font-heading" style={{ color: 'hsl(var(--amber))' }}
        >
          {headline}
        </h2>
        <p className="text-[0.65rem] mt-0.5" style={{ color: 'hsl(220 27% 65%)' }}>
          {hint}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-2">
        {cards.map((card) => (
          <button
            key={card.action}
            type="button"
            onClick={() => props.onAction(card.action)}
            className={cn(
              'flex flex-col items-start gap-2 p-3.5 rounded-xl transition-all text-left cursor-pointer',
              card.fullWidth && 'col-span-2',
              VARIANT_CLASSES[card.variant],
            )}
          >
            <span className="text-base leading-none">{card.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-bold leading-tight">{card.title}</p>
              <p className={cn(
                'text-[0.63rem] leading-tight mt-0.5',
                card.variant === 'primary' ? 'opacity-70' : 'opacity-50',
              )}>
                {card.description}
              </p>
            </div>
            {card.amount && (
              <p className="font-heading text-xl font-extrabold leading-none mt-1">
                {card.amount}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
