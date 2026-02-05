

# Fix: Estimate Grouping and End-to-End PO Ordering Issues

## Why Estimates Are Not Grouped

The current approved estimate (`549ea7a5...`) has **119 items, all with `pack_name = NULL`**. This happened because the items were imported via the legacy flat CSV path, which did not capture pack grouping. After our previous fix (removing the `pack_name IS NOT NULL` filter), all 119 items now appear under a single "Ungrouped" label -- technically visible, but not organized.

The items themselves also contain **garbage data** from a poorly parsed PDF-to-CSV conversion (e.g., "Quote Date6359017600 E Smith Rd", "4:52:27PM Date Printed: Page 1 of 5"). This is a data quality issue from the source file, not a code bug.

---

## Issues Found During End-to-End Analysis

### Issue 1: "Project Estimate" toggle always shows, even when no estimate exists

**File:** `src/components/po-wizard-v2/ItemsScreen.tsx` (line 97)

The `OrderingModeToggle` is hardcoded with `hasEstimate={true}`, meaning the "Project Estimate" / "Full Catalog" toggle always appears. When there is no approved estimate, clicking "Project Estimate" shows the confusing "No approved estimate found" message. This toggle should only appear when an approved estimate actually exists.

**Fix:** Pass `hasEstimate` as a prop from the parent, and have the `PackSelector` (or the `ItemsScreen`) dynamically check if an approved estimate exists before showing the toggle.

### Issue 2: Estimate-to-PO traceability not saved

**File:** `src/components/project/PurchaseOrdersTab.tsx` (lines 123-136)

When a user selects a pack from an estimate and creates a PO, the wizard tracks `source_estimate_id`, `source_pack_name`, and `pack_modified` in its form data. However, the `handleCreatePO` function **never writes these fields** to the `purchase_orders` table -- even though the columns exist in the database.

**Fix:** Include these three fields in the insert payload.

### Issue 3: No line_total calculation on PO insert

**File:** `src/components/project/PurchaseOrdersTab.tsx` (lines 142-156)

The `po_line_items` insert omits `line_total`. While the supplier fills in pricing later, for estimate-sourced items where `unit_price` may already be known from the estimate, this creates inconsistency.

**Fix:** Set `line_total` based on the estimate's unit_price if available (minor improvement).

### Issue 4: PackSelector doesn't filter by supplier

**File:** `src/components/po-wizard-v2/PackSelector.tsx` (lines 51-57)

The `supplierId` prop is accepted but never used. The query fetches the latest approved estimate for the project regardless of which supplier was selected. If the project has multiple supplier estimates, the user could see an estimate from Supplier A while creating a PO for Supplier B.

**Fix:** Filter the estimate query by the supplier's organization ID. This requires a join since `supplier_estimates` stores `supplier_org_id` but the wizard passes the `suppliers` table ID.

---

## Changes

### 1. `src/components/po-wizard-v2/PackSelector.tsx`

- **Filter estimates by supplier:** Look up the supplier's `organization_id` from the `suppliers` table using `supplierId`, then filter `supplier_estimates` by `supplier_org_id`
- **Surface estimate item count:** Add a count display in the pack cards for better UX

### 2. `src/components/po-wizard-v2/ItemsScreen.tsx`

- **Make `hasEstimate` dynamic:** Add a new prop `hasApprovedEstimate` (boolean) that gets passed from the parent
- **Pass it to `OrderingModeToggle`** instead of the hardcoded `true`
- **Default ordering mode to `catalog`** when no approved estimate exists

### 3. `src/components/po-wizard-v2/POWizardV2.tsx`

- **Check for approved estimate on open:** When the wizard opens and a supplier is selected, run a quick query to check if an approved estimate exists for this project + supplier combination
- **Pass `hasApprovedEstimate`** down to `ItemsScreen`

### 4. `src/components/project/PurchaseOrdersTab.tsx`

- **Persist estimate linkage:** Add `source_estimate_id`, `source_pack_name`, and `pack_modified` to the PO insert payload in `handleCreatePO`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/po-wizard-v2/PackSelector.tsx` | Filter estimates by selected supplier's org ID |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Make `hasEstimate` a dynamic prop; default mode to `catalog` when no estimate |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Add estimate existence check; pass `hasApprovedEstimate` to ItemsScreen |
| `src/components/project/PurchaseOrdersTab.tsx` | Save `source_estimate_id`, `source_pack_name`, `pack_modified` in PO insert |

No database migrations needed -- all required columns already exist.

