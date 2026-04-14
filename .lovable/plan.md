

# Hide Pricing & Supplier Controls from FC on Work Order Detail

## Problem
The FC currently sees financial data they shouldn't: line item dollar amounts, "Priced" badges, the "Apply supplier pricing" button, "Open linked PO" link, and supplier pricing section. The FC should only enter materials (description, qty, UOM) and submit to TC.

## Changes

### 1. `src/components/change-orders/COMaterialsPanel.tsx`
- **Hide the entire "Supplier pricing" section for FC**: Change the gate on line 918 from `canManageMaterials` to `canManageMaterials && !isFC`. This hides the supplier pricing request area, "Apply supplier pricing" button, and "Open linked PO" link from FC.
- The pricing columns (unit cost, markup, amount) are already hidden via `showPricingColumns` being `false` for FC — no change needed there.

### 2. `src/components/change-orders/COLineItemRow.tsx`
- **Hide dollar amounts for FC**: Wrap the `totalForRole > 0` display (line 166-168) and the "Priced" badge (line 156-159) with `!isFC` checks so the FC doesn't see prices or pricing status on scope line items.
- Hide the internal cost pill for FC as well.

### 3. `src/components/change-orders/COSidebar.tsx`
- **Hide FC Profitability section**: The FC should not see Revenue, Internal Costs, or Gross Margin. Remove the `isFC` from the profitability condition on line 157, changing `(isTC || isFC)` to just `isTC`.
- The "My Labor" / "Total" section (lines 141-154) can stay — it just shows the FC's own logged hours total.

### 4. `src/components/change-orders/COKPIStrip.tsx`
- Verify FC tiles don't expose TC/GC pricing. The FC-specific tiles already show only FC labor — confirm and leave as-is if correct.

## Summary
Four files, surgical changes: hide supplier pricing controls, line item dollar amounts, and profitability from the FC role. FC keeps: material entry (description/qty/UOM), hour logging, and submit-to-TC flow.

