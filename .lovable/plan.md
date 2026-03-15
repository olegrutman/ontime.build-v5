

# Tax Uniformity Audit & Fix Plan

## Current State

### Where tax IS applied:
| Location | How Tax Works |
|---|---|
| **PO Creation** (`PurchaseOrdersTab.tsx` L240-253) | Fetches `sales_tax_percent` from the linked `supplier_estimates` record. If no estimate is linked (`source_estimate_id` is null), **tax = 0%** |
| **PO Edit** (`PurchaseOrdersTab.tsx` L524-537) | Same pattern — fetches from estimate if linked, otherwise uses existing PO's `sales_tax_percent` (which may be 0) |
| **Supplier Pricing** (`PODetail.tsx`) | Supplier can manually edit `salesTaxPercent` during price editing. Saved to PO on lock/save |
| **Financial Dashboards** (`useProjectFinancials.ts`, `useSupplierMaterialsOverview.ts`) | Reads `sales_tax_percent` from each PO and applies it to line item totals |
| **Estimate vs Orders Card** (`SupplierEstimateVsOrdersCard.tsx`) | Reads PO-level `sales_tax_percent` for comparison |
| **Supplier Invoice from PO** (`CreateSupplierInvoiceFromPO.tsx`) | Uses stored `po_tax_total` and `po_total` |

### Where tax is MISSING:
| Gap | Issue |
|---|---|
| **PO Wizard Review Screen** | Shows subtotals but **never displays tax or grand total with tax** |
| **POs without an estimate** | When a PO is created via catalog browsing (no estimate linked), `estimateTaxPercent` defaults to **0%** — no way for the user to set tax |
| **PO Wizard data model** | `POWizardV2Data` type has no `sales_tax_percent` field — tax is only resolved at submission time |

## Root Cause

Tax is sourced **exclusively from the estimate**. If a PO has no linked estimate, tax is silently 0%. The wizard never shows or lets the user confirm the tax rate.

## Proposed Fix

### 1. Add `sales_tax_percent` to `POWizardV2Data`

Add the field to the wizard data type so tax flows through the entire wizard experience.

### 2. Resolve tax rate at supplier selection time

When the user selects a supplier in the Header screen, look up the most recent approved estimate for that project + supplier and auto-populate `sales_tax_percent`. If no estimate exists, default to the **project-level** tax rate (we should store a fallback on the project or use the most recent estimate for the project regardless of supplier).

**Fallback chain:** Linked estimate → Any approved estimate for this supplier+project → 0% (with a visible warning).

### 3. Show tax in the Review Screen

Add a tax line between "Subtotal" and "Total" in `ReviewScreen.tsx`:
- Display: `Tax (X.XX%)` → `$Y.YY`
- Grand total = subtotal + tax

### 4. Allow manual tax override in wizard

On the Review screen, make the tax percentage editable (small inline input like in PODetail). This covers the case where no estimate exists or the rate needs adjustment.

### 5. Use resolved tax at submission time

In `PurchaseOrdersTab.tsx`, use `data.sales_tax_percent` from the wizard data instead of re-fetching from the estimate. This ensures what the user saw in Review is what gets saved.

## Files to Modify

| File | Change |
|---|---|
| `src/types/poWizardV2.ts` | Add `sales_tax_percent: number` to `POWizardV2Data` and `INITIAL_PO_WIZARD_V2_DATA` |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Fetch tax rate when supplier changes; pass to ReviewScreen |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Display tax line with editable percentage; show grand total |
| `src/components/project/PurchaseOrdersTab.tsx` | Use `data.sales_tax_percent` from wizard data instead of re-fetching from estimate at create/edit time |

