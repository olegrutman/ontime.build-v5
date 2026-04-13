

# Fix: Material Responsibility Privacy for COs and POs

## Problem
When GC is set as material-responsible on the project contract, TC can still see pricing data in the CO materials panel. The screenshot confirms a TC user sees "Line Total $1,217.16" in the product picker. Three bugs cause this:

### Bug 1: `showPricingColumns` uses raw CO field instead of resolved responsibility
**File**: `COMaterialsPanel.tsx` line 146
```
const showPricingColumns = isFC ? false : isGC ? true : isTC && materialsResponsible === 'TC';
```
The `materialsResponsible` prop comes from `co.materials_responsible` — a field set during wizard creation that can be `null`. The resolved value from `useCOResponsibility` (which checks project contract defaults + CO overrides) is computed in `CODetailLayout.tsx` but never passed down to this panel.

### Bug 2: Product Picker pricing is hardcoded visible
**File**: `COMaterialsPanel.tsx` line 1031
```
hidePricing={false}
```
The `ProductPickerContent` has a `hidePricing` prop but it's hardcoded to `false`. When GC is material-responsible, TC should not see prices in the picker.

### Bug 3: CO-created POs don't respect pricing visibility
When `COMaterialsPanel` creates a PO via `createPricingRequest()`, the `pricing_owner_org_id` is resolved from the project contract (line 480) — this part is correct. But the TC can still navigate to and view the PO's pricing since the PO tab doesn't cross-check material responsibility for CO-sourced POs.

## Fix Plan

### 1. Pass resolved responsibility to COMaterialsPanel
In `CODetailLayout.tsx`, pass `responsibility.materialResponsible` as the `materialsResponsible` prop instead of `co.materials_responsible`. This ensures the panel uses the resolved value (contract default + override).

### 2. Fix `showPricingColumns` logic
The existing logic is already correct: `isTC && materialsResponsible === 'TC'`. Once we pass the resolved value (which will be `'GC'` when GC is responsible), TC will correctly get `showPricingColumns = false`.

### 3. Wire `hidePricing` in Product Picker
Change the hardcoded `hidePricing={false}` to `hidePricing={!showPricingColumns}` so the picker respects the same visibility rule.

### 4. Same fix for COEquipmentPanel
Check the equipment panel for the same pattern and apply the same fix using `responsibility.equipmentResponsible`.

### Files to modify
- `src/components/change-orders/CODetailLayout.tsx` — pass `responsibility.materialResponsible` and `responsibility.equipmentResponsible` as props
- `src/components/change-orders/COMaterialsPanel.tsx` — fix `hidePricing` prop on ProductPickerContent
- `src/components/change-orders/COEquipmentPanel.tsx` — audit for same issue

### No database or RLS changes needed
The `pricing_owner_org_id` resolution in `resolvePricingOwnerOrgId()` is correct. The PO-level visibility via `usePOPricingVisibility` and `PurchaseOrdersTab.getCanViewPricing` already checks `pricing_owner_org_id`, so PO pricing is gated correctly once the owner is set right. The bug is purely in the CO materials UI layer.

