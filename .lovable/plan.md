

# Match Work Orders Page to Invoice Page on Mobile

Align the Work Orders tab layout with the Invoice tab so both have the same visual structure on mobile: summary stat cards at the top, a dropdown filter (instead of scrollable buttons), and consistent card grid.

## What Changes

### 1. Add summary stat cards to `WorkOrdersTab.tsx`

Add a grid of summary cards (matching the Invoice tab's `renderSummaryCards`) at the top of the WO list, showing:
- **In Progress** (draft count) with FileEdit icon
- **FC Input** count with Clock icon
- **TC Pricing** count with DollarSign icon
- **Approval** (ready_for_approval count) with CheckCircle2 icon
- **Contracted** count with Wallet icon

Uses the same card styling: `Card p-4 relative overflow-hidden` with bold metric, uppercase label, and icon badge. Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

### 2. Replace horizontal scroll filter buttons with a Select dropdown

Replace the scrollable row of status filter buttons (lines 265-280) with a `Select` dropdown matching the Invoice tab's filter style:
- `SelectTrigger` with Filter icon and `w-[160px]`
- Options: All Statuses, then each `ChangeOrderStatus` with label and count

### 3. Keep everything else the same

The card rendering (`renderWorkOrderCard`), section separation (Fixed Price / T&M), wizard dialogs, SOV alert, and create button all remain unchanged.

## Files Modified

| File | Change |
|------|--------|
| `src/components/project/WorkOrdersTab.tsx` | Add summary cards, replace filter buttons with Select dropdown |

## Technical Details

New imports needed in `WorkOrdersTab.tsx`:
- `Card` is already imported
- Add: `Filter, Clock, CheckCircle2, Wallet, DollarSign` from lucide-react (some already imported)
- Add: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`

The summary cards reuse the exact same pattern from `InvoicesTab.tsx` lines 341-390, adapted for WO status counts.

## What Is NOT Changed
- Work order card design (already matches RecordCard pattern)
- Fixed Price / T&M section separation
- Wizard and dialog flows
- Desktop behavior (cards still render in grid)
- No database or logic changes

