

# Restructure GC Work Order Pricing View

## Problem
The current GC pricing view is a flat list (TC Labor, Materials, Equipment, Total) that doesn't account for cost responsibility. When the GC is responsible for materials or equipment, those costs should be shown separately from the TC contract cost. The GC also can't see TC's hours and hourly rate in the pricing card.

## Solution

Restructure the GC view in `ContractedPricingCard.tsx` into a clear layout:

### Top Section: Total Contracted Price
Sum of all costs the GC pays for this work order (TC labor + materials + equipment regardless of who is responsible).

### Below: Three separate tiles/sections based on cost responsibility

1. **TC Contract** tile
   - TC labor line items showing hours, hourly rate, and total (or lump sum)
   - If TC is responsible for equipment, include equipment total here too
   - Shows the TC company name

2. **Materials** tile (if materials required)
   - Shows material cost from linked PO or manual materials
   - Label indicates responsibility (GC or TC)

3. **Equipment** tile (only if GC is responsible for equipment)
   - Equipment costs shown separately when GC pays directly
   - If TC is responsible, equipment is already included in the TC Contract tile

## Technical Changes

### File: `src/components/change-order-detail/ContractedPricingCard.tsx`

**Update `GCPricingView` props** to include:
- `tcLabor: ChangeOrderTCLabor[]` -- to display individual TC labor entries with hours/rates
- `materialCostResponsibility: 'GC' | 'TC' | null`
- `equipmentCostResponsibility: 'GC' | 'TC' | null`
- `requiresMaterials: boolean`
- `requiresEquipment: boolean`

**Rewrite `GCPricingView` component** to render:

```text
+-------------------------------+
| TOTAL WORK ORDER COST         |
| $X,XXX.XX                     |
+-------------------------------+

+-------------------------------+
| TC Contract                   |
| Labor Entry 1: 8hrs @ $65/hr  |
|                      $520.00  |
| Labor Entry 2: Lump Sum       |
|                      $300.00  |
| Equipment (TC resp.)  $200.00 |  <-- only if TC responsible
|                               |
| Subtotal             $1,020   |
| Paid to: CompanyName          |
+-------------------------------+

+-------------------------------+
| Materials (GC Responsible)    |
| PO subtotal + markup  $500   |
+-------------------------------+

+-------------------------------+      <-- only if GC responsible
| Equipment (GC Responsible)    |
| Total                 $200    |
+-------------------------------+
```

**Update the parent call** in `ContractedPricingCard` to pass the new props from `changeOrder` (cost responsibility fields, requires flags) and `tcLabor` array to `GCPricingView`.

### File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`
No changes needed -- `tcLabor` is already passed as a prop to `ContractedPricingCard`.

## Summary

| File | Change |
|------|--------|
| `ContractedPricingCard.tsx` | Restructure GC view into Total + TC Contract tile (with hours/rates) + Materials tile + Equipment tile, split by cost responsibility |

