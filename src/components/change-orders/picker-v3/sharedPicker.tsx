import { cn } from '@/lib/utils';
import type { SystemOption, CauseOption } from './types';

export const FALLBACK_LOCATIONS = [
  { id: 'l1', icon: '🏢', label: 'Level 1', sub: 'Ground floor' },
  { id: 'l2', icon: '🏢', label: 'Level 2', sub: 'Second floor' },
  { id: 'l3', icon: '🏗', label: 'Exterior', sub: 'Building exterior' },
  { id: 'l6', icon: '⊞', label: 'Other / Custom', sub: 'Specify location' },
];

export const SYSTEMS: SystemOption[] = [
  { id: 'floor', icon: '▭', label: 'Floor System', sub: 'Joists, subfloor, beams' },
  { id: 'wall', icon: '▮', label: 'Wall System', sub: 'Framing, sheathing' },
  { id: 'roof', icon: '◭', label: 'Roof System', sub: 'Rafters, ridge, sheathing' },
  { id: 'ceiling', icon: '▱', label: 'Ceiling System', sub: 'Joists, drops, soffits' },
  { id: 'exterior', icon: '◫', label: 'Exterior Envelope', sub: 'Siding, WRB, flashing' },
  { id: 'openings', icon: '⊟', label: 'Openings', sub: 'Windows, doors, ROs' },
  { id: 'deck', icon: '▥', label: 'Deck / Balcony', sub: 'Joists, decking' },
  { id: 'stair', icon: '⊿', label: 'Stair', sub: 'Stringers, treads' },
  { id: 'other', icon: '⊞', label: 'Other', sub: 'Specify system' },
];

export const CAUSES: { group: string; groupColor: string; groupLabel: string; groupMeta: string; items: CauseOption[] }[] = [
  {
    group: 'conflict', groupColor: 'bg-blue-600',
    groupLabel: 'Someone else changed something', groupMeta: '→ usually a Change Order, billable',
    items: [
      { id: 'mech', group: 'conflict', icon: '🔧', label: 'Mechanical Conflict', sub: 'HVAC needs clearance', docType: 'CO', billable: 'yes', suggested: true, reason: 'gc_request' as import('@/types/changeOrder').COReasonCode, allowedSystems: ['floor', 'wall', 'ceiling', 'roof'] },
      { id: 'plumb', group: 'conflict', icon: '💧', label: 'Plumbing Conflict', sub: 'Waste / supply routing', docType: 'CO', billable: 'yes', reason: 'gc_request' as import('@/types/changeOrder').COReasonCode, allowedSystems: ['floor', 'wall', 'ceiling'] },
      { id: 'elec', group: 'conflict', icon: '⚡', label: 'Electrical Conflict', sub: 'Panel, conduit, fixture', docType: 'CO', billable: 'yes', reason: 'gc_request' as import('@/types/changeOrder').COReasonCode, allowedSystems: ['floor', 'wall', 'ceiling'] },
      { id: 'gc', group: 'conflict', icon: '📋', label: 'GC Request', sub: 'Field directive from GC', docType: 'CO', billable: 'yes', reason: 'gc_request' as import('@/types/changeOrder').COReasonCode },
      { id: 'plan', group: 'conflict', icon: '📐', label: 'Plan Revision', sub: 'Architect / engineer change', docType: 'CO', billable: 'yes', reason: 'design_change' as import('@/types/changeOrder').COReasonCode },
      { id: 'unfor', group: 'conflict', icon: '❓', label: 'Unforeseen Condition', sub: 'Hidden damage, existing', docType: 'CO', billable: 'yes', reason: 'other' as import('@/types/changeOrder').COReasonCode },
    ],
  },
  {
    group: 'site_issue', groupColor: 'bg-yellow-600',
    groupLabel: 'Something on site went wrong', groupMeta: '→ usually a Work Order, sometimes backcharge',
    items: [
      { id: 'dmg', group: 'site_issue', icon: '⚠', label: 'Damaged Work', sub: 'By us, others, weather, theft', docType: 'WO', billable: 'maybe', reason: 'damaged_by_others' as import('@/types/changeOrder').COReasonCode },
      { id: 'frame', group: 'site_issue', icon: '📏', label: 'Framing Correction', sub: 'Out of plumb, wrong member', docType: 'WO', billable: 'no', reason: 'rework' as import('@/types/changeOrder').COReasonCode, allowedSystems: ['floor', 'wall', 'roof', 'ceiling', 'deck', 'stair', 'openings'] },
      { id: 'miss', group: 'site_issue', icon: '⊟', label: 'Missed Scope', sub: 'Gap in plans', docType: 'CO', billable: 'yes', reason: 'addition' as import('@/types/changeOrder').COReasonCode },
      { id: 'mat', group: 'site_issue', icon: '📦', label: 'Material Defect', sub: 'Wrong / defective', docType: 'WO', billable: 'maybe', reason: 'other' as import('@/types/changeOrder').COReasonCode },
    ],
  },
  {
    group: 'addon', groupColor: 'bg-green-600',
    groupLabel: 'Add-on / additional scope', groupMeta: '→ Change Order',
    items: [
      { id: 'upg', group: 'addon', icon: '⬆', label: 'Owner Upgrade', sub: 'Spec or finish upgrade', docType: 'CO', billable: 'yes', reason: 'owner_request' as import('@/types/changeOrder').COReasonCode },
      { id: 've', group: 'addon', icon: '⇄', label: 'Value Engineering', sub: 'Swap to reduce / improve', docType: 'CO', billable: 'yes', reason: 'design_change' as import('@/types/changeOrder').COReasonCode },
      { id: 'punch', group: 'addon', icon: '✓', label: 'Punch List Add', sub: 'Beyond original contract', docType: 'WO', billable: 'maybe', reason: 'addition' as import('@/types/changeOrder').COReasonCode },
    ],
  },
];

export function floorLabel(n: number): string {
  switch (n) {
    case 1: return 'Main Floor';
    case 2: return 'Second Floor';
    case 3: return 'Third Floor';
    case 4: return 'Fourth Floor';
    case 5: return 'Fifth Floor';
    default: return `Level ${n}`;
  }
}

export function Tile({ selected, onClick, icon, label, sub, badge }: {
  selected: boolean; onClick: () => void; icon: string; label: string; sub: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[64px] transition-all relative',
        selected
          ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
          : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
      )}
    >
      {badge && !selected && (
        <span className="absolute top-[7px] right-[7px] text-[0.55rem] font-extrabold px-1.5 py-px rounded-lg bg-amber-100 text-amber-700 uppercase tracking-[0.4px]">
          {badge}
        </span>
      )}
      {selected && (
        <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
          ✓
        </span>
      )}
      <span className="text-lg">{icon}</span>
      <span className="text-[0.78rem] font-bold text-foreground leading-tight">{label}</span>
      <span className="text-[0.62rem] text-muted-foreground">{sub}</span>
    </button>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
      {children}
    </p>
  );
}
