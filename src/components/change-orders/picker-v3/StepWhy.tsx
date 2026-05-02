import { cn } from '@/lib/utils';
import type { PickerState, PickerAction, CauseOption } from './types';
import type { COReasonCode } from '@/types/changeOrder';

interface StepWhyProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

const CAUSES: { group: string; groupColor: string; groupLabel: string; groupMeta: string; items: CauseOption[] }[] = [
  {
    group: 'conflict',
    groupColor: 'bg-blue-600',
    groupLabel: 'Someone else changed something',
    groupMeta: '→ usually a Change Order, billable',
    items: [
      { id: 'mech', group: 'conflict', icon: '🔧', label: 'Mechanical Conflict', sub: 'HVAC needs clearance', docType: 'CO', billable: 'yes', suggested: true, reason: 'gc_request' as COReasonCode },
      { id: 'plumb', group: 'conflict', icon: '💧', label: 'Plumbing Conflict', sub: 'Waste / supply routing', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'elec', group: 'conflict', icon: '⚡', label: 'Electrical Conflict', sub: 'Panel, conduit, fixture', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'gc', group: 'conflict', icon: '📋', label: 'GC Request', sub: 'Field directive from GC', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'plan', group: 'conflict', icon: '📐', label: 'Plan Revision', sub: 'Architect / engineer change', docType: 'CO', billable: 'yes', reason: 'design_change' as COReasonCode },
      { id: 'unfor', group: 'conflict', icon: '❓', label: 'Unforeseen Condition', sub: 'Hidden damage, existing', docType: 'CO', billable: 'yes', reason: 'other' as COReasonCode },
    ],
  },
  {
    group: 'site_issue',
    groupColor: 'bg-yellow-600',
    groupLabel: 'Something on site went wrong',
    groupMeta: '→ usually a Work Order, sometimes backcharge',
    items: [
      { id: 'dmg', group: 'site_issue', icon: '⚠', label: 'Damaged Work', sub: 'By us, others, weather, theft', docType: 'WO', billable: 'maybe', reason: 'damaged_by_others' as COReasonCode },
      { id: 'frame', group: 'site_issue', icon: '📏', label: 'Framing Correction', sub: 'Out of plumb, wrong member', docType: 'WO', billable: 'no', reason: 'rework' as COReasonCode },
      { id: 'miss', group: 'site_issue', icon: '⊟', label: 'Missed Scope', sub: 'Gap in plans', docType: 'CO', billable: 'yes', reason: 'addition' as COReasonCode },
      { id: 'mat', group: 'site_issue', icon: '📦', label: 'Material Defect', sub: 'Wrong / defective', docType: 'WO', billable: 'maybe', reason: 'other' as COReasonCode },
    ],
  },
  {
    group: 'addon',
    groupColor: 'bg-green-600',
    groupLabel: 'Add-on / additional scope',
    groupMeta: '→ Change Order',
    items: [
      { id: 'upg', group: 'addon', icon: '⬆', label: 'Owner Upgrade', sub: 'Spec or finish upgrade', docType: 'CO', billable: 'yes', reason: 'owner_request' as COReasonCode },
      { id: 've', group: 'addon', icon: '⇄', label: 'Value Engineering', sub: 'Swap to reduce / improve', docType: 'CO', billable: 'yes', reason: 'design_change' as COReasonCode },
      { id: 'punch', group: 'addon', icon: '✓', label: 'Punch List Add', sub: 'Beyond original contract', docType: 'WO', billable: 'maybe', reason: 'addition' as COReasonCode },
    ],
  },
];

export function StepWhy({ state, dispatch }: StepWhyProps) {
  const cur = state.items[state.currentItemIndex];

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 2 of 9 · Cause</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What caused the change?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          The cause determines whether this is a Change Order or Work Order, who pays, and who signs off.
        </p>
      </div>

      {CAUSES.map(group => (
        <div key={group.group} className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0', group.groupColor)} />
            <span className="text-[0.78rem] font-bold text-foreground/80">{group.groupLabel}</span>
            <span className="text-[0.68rem] text-muted-foreground font-medium">{group.groupMeta}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {group.items.map(cause => {
              const selected = cur.causeId === cause.id;
              return (
                <button
                  key={cause.id}
                  type="button"
                  onClick={() => dispatch({
                    type: 'SET_CAUSE',
                    causeId: cause.id,
                    causeName: cause.label,
                    docType: cause.docType,
                    billable: cause.billable,
                    reason: cause.reason,
                  })}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[64px] transition-all relative',
                    selected
                      ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                      : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
                    cause.suggested && !selected && 'border-amber-200',
                  )}
                >
                  {cause.suggested && !selected && (
                    <span className="absolute top-[7px] right-[7px] text-[0.55rem] font-extrabold px-1.5 py-px rounded-lg bg-amber-100 text-amber-700 uppercase tracking-[0.4px]">
                      ★ Common
                    </span>
                  )}
                  {selected && (
                    <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
                      ✓
                    </span>
                  )}
                  <span className="text-lg">{cause.icon}</span>
                  <span className="text-[0.78rem] font-bold text-foreground leading-tight">{cause.label}</span>
                  <span className="text-[0.62rem] text-muted-foreground">{cause.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Inference badges */}
      {cur.causeId && (
        <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200 rounded-xl mt-4 animate-fade-in">
          <p className="w-full text-[0.62rem] font-bold text-amber-800 uppercase tracking-[1px] flex items-center gap-1.5">
            ✦ Based on your pick, we'll set this up as:
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Document</span>
            <span className="text-foreground">{cur.docType === 'CO' ? 'Change Order (CO)' : 'Work Order (WO)'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Billable</span>
            <span className="text-foreground">{cur.billable === 'yes' ? 'Yes' : cur.billable === 'maybe' ? 'Maybe' : 'No'}</span>
          </span>
        </div>
      )}
    </div>
  );
}
