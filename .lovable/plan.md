

# Fix: TC Billing & Cash Position Formulas Are Double-Counting Retainage

## Problem

The invoice data model stores:
- `subtotal` = gross billing amount (e.g. $17,064)
- `retainage_amount` = withheld portion (e.g. $853.20)
- `total_amount` = subtotal − retainage = net due (e.g. $16,210.80)

The current code has **two double-counting bugs**:

### Bug 1: Outstanding uses `total_amount` (already net of retainage) but then subtracts retainage again
```
receivablesInvoiced = sum of total_amount = $16,210.80 (already net)
receivablesOutstanding = $16,210.80 - $0 collected - $853.20 retainage = $15,357.60  ← WRONG
```
Should be $16,210.80 (nothing collected yet, retainage already excluded from total_amount).

Same bug on payables side.

### Bug 2: Net Cash adds `payablesRetainage` which double-counts
```
Net Cash = collected($0) - paid($0) + payablesRetainage($682.56) = $682.56  ← WRONG
```
No cash has moved — both invoices are APPROVED, not PAID. Net cash should be $0.

Even when invoices ARE paid, the retainage is already implicitly reflected: `payablesPaid` uses `total_amount` (net of retainage), so the TC automatically "keeps" the retainage by paying less. Adding it again double-counts.

## Correct Formulas

**Option: Use `subtotal` (gross) as "Invoiced", subtract retainage for Outstanding**

This is clearer for construction users — they see the full billing and how retainage reduces what's outstanding:

| Row | Formula |
|-----|---------|
| Invoiced | sum of `subtotal` (gross amount billed) |
| Collected/Paid | sum of `total_amount` where status = PAID |
| Retainage Held | sum of `retainage_amount` (informational) |
| **Outstanding** | **Invoiced − Collected − Retainage** |
| **Net Cash** | **receivablesCollected − payablesPaid** (no retainage term) |

Verification with both invoices PAID:
- Receivables: Invoiced $17,064 − Collected $16,210.80 − Retainage $853.20 = $0 outstanding ✓
- Payables: Invoiced $13,651.20 − Paid $12,968.64 − Retainage $682.56 = $0 outstanding ✓
- Net Cash: $16,210.80 − $12,968.64 = $3,242.16 ✓ (TC keeps the spread + retainage is implicit)

## Changes

### 1. `src/hooks/useProjectFinancials.ts`
- Change `receivablesInvoiced` to sum `subtotal` instead of `total_amount` (line 304)
- Change `payablesInvoiced` to sum `subtotal` instead of `total_amount` (line 307)
- Remove `payablesRetainage` state — not needed for calculations; retainage is already tracked per-side

### 2. `src/components/project/BillingCashCard.tsx`
- Remove `payablesRetainage` from destructuring
- Fix Net Cash formula: `receivablesCollected - payablesPaid` (remove `+ payablesRetainage`)
- Fix payables Outstanding: `payablesInvoiced - payablesPaid - payablesRetainage` → since payablesInvoiced is now gross (subtotal), keep the retainage subtraction
- Actually, since `payablesRetainage` is being removed from the hook, compute it inline OR keep it in the hook but don't use it in net cash

**Revised approach**: Keep `payablesRetainage` in the hook (for the display row) but fix the two formulas:
- Outstanding formulas stay: `invoiced - collected/paid - retainage` (correct when invoiced = subtotal)
- Net Cash: `receivablesCollected - payablesPaid` (remove `+ payablesRetainage`)
- Net Cash subtitle: "Collected − Paid"

**3 lines in hook, 2 lines in card. No database changes.**

