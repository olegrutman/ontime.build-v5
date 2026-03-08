

# UI Audit Report: Text Overflow and Number Alignment Issues

## Findings

### Bug 1 (HIGH): Currency values show inconsistent decimals across the app
**Affects:** Overview, Invoices, Billing & Cash Position, and many other financial displays.

On the Overview page, values like `$21,250.20` render as **"$21,250.2"** — the trailing zero is dropped. This happens because ~20+ `fmt`/`formatCurrency` helper functions across the app use `minimumFractionDigits: 0` without also setting `maximumFractionDigits: 0`. The result:
- Whole-dollar amounts show cleanly as "$150,000" (good)
- Values with cents show "$21,250.2" instead of "$21,250.20" (bad — looks truncated)

This is inconsistent and looks like a bug to users.

**Affected files (non-exhaustive — the pattern repeats in ~15+ files):**
- `BillingCashCard.tsx` (line 8)
- `ContractHeroCard.tsx` (line 13)
- `BudgetTracking.tsx` (line 13)
- `WorkOrderSummaryCard.tsx` (line 27)
- `ProjectFinancialsSection.tsx` (line 16)
- `ProjectFinancialsSectionNew.tsx` (line 35)
- `SupplierOperationalSummary.tsx` (line 76)
- `InvoicesTab.tsx` (lines 443, 484)
- `InvoiceCard.tsx` (line 28)
- `SupplierPOSummaryCard.tsx` (line 18)
- `ProjectContractsSection.tsx` (line 49)
- `ReviewStep.tsx` (both wizard versions)

**Fix:** Create a single shared `formatCurrency` utility in `src/lib/utils.ts` that all components import. Use `minimumFractionDigits: 0, maximumFractionDigits: 0` for clean whole-dollar display everywhere, OR use `minimumFractionDigits: 2` for consistent two-decimal display. Then replace all local `fmt`/`formatCurrency` functions with imports from the shared utility.

Recommended approach: `maximumFractionDigits: 0` for display values (rounds to whole dollars — consistent with the app's existing intent), keeping the compact notation for values over $1M.

### Bug 2 (MEDIUM): SOV card header overflow on mobile (390px)
On the SOV page at mobile width, the contract name + "Contract" badge + "Billing Active" badge + lock/delete icons all compete for horizontal space. The "2 Contracts" count badge in the top-right is clipped. The contract name wraps to 3 lines while action buttons float right and overlap visually.

**Fix:** In `ContractSOVEditor.tsx`, make the SOV card header responsive:
- Stack the contract name and badges vertically on small screens
- Move action icons (lock, delete, billing badge) below the title on mobile
- Use `truncate` or `line-clamp-2` on long contract names
- Ensure "2 Contracts" badge doesn't clip by using `shrink-0`

### Bug 3 (LOW): SOV progress bar text "$21,250 / $149,995 billed" — dollar amounts not right-aligned
The progress bar label text under each SOV card header uses left-aligned small text. The dollar amounts should use `tabular-nums` for proper digit alignment when scanning vertically.

**Fix:** Add `tabular-nums` class to the billing summary text in the SOV card headers.

---

## Plan

### Step 1: Create shared currency formatter
Add a `formatCurrency` function to `src/lib/utils.ts` with consistent formatting (whole dollars, compact for $1M+).

### Step 2: Replace all local formatters
Update all ~15+ files to import from the shared utility, removing their local `fmt`/`formatCurrency` definitions. This ensures every dollar value in the app renders consistently.

### Step 3: Fix SOV card mobile layout
Update `ContractSOVEditor.tsx` to make contract card headers stack properly on small screens — wrap badges below title, prevent clipping of the contracts count.

### Step 4: Add tabular-nums to financial text
Ensure all currency display elements use `tabular-nums` for proper vertical alignment of digits.

