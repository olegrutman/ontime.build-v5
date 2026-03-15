

# TCA: Three Submit Actions — Analysis & Recommendations

## Current State (3 Submit Touchpoints)

| # | Location | Button Label | What It Actually Does |
|---|----------|-------------|----------------------|
| 1 | **Wizard ReviewScreen** | "Submit PO" | Creates PO as **ACTIVE** (draft). Does NOT submit to supplier. |
| 2 | **POCard** (list view) | "Submit to Supplier" | For TC: sets PENDING_APPROVAL. For GC: just opens the detail view (`setSelectedPOId`). |
| 3 | **PODetail** (detail view) | "Submit to Supplier" | Sets status to SUBMITTED but does **NOT** send the email via `send-po` edge function. |

## Bugs & Inconsistencies Found

1. **Wizard label is misleading**: "Submit PO" implies it's being sent to the supplier, but it only saves a draft (ACTIVE status). Users may think the PO was sent when it wasn't.

2. **POCard submit for GC is a no-op redirect**: `handleSubmitToSupplier` for GC users just calls `setSelectedPOId(po.id)` — it opens the detail view. The user clicks "Submit to Supplier" and gets navigated to a different screen where they have to click "Submit to Supplier" again.

3. **PODetail submit doesn't send the email**: It sets status to SUBMITTED but never calls the `send-po` edge function. Compare with the approval flow which properly calls `supabase.functions.invoke('send-po', ...)`. This means the supplier never receives the PO email when a GC submits directly.

4. **Two clicks required for GC**: Create PO (wizard) → Find PO in list → Click Submit → Opens detail → Click Submit again. That's 4 steps for what should be 2.

## Recommended Fix (Business Best Practice)

### A. Wizard: Rename + Add "Create & Send" Option
- Rename "Submit PO" to **"Create PO"** (honest label for draft creation)
- Add a second primary button: **"Create & Send to Supplier"** that creates the PO AND immediately triggers the `send-po` edge function (or PENDING_APPROVAL for TCs)
- This eliminates the need to find the PO again after creation

### B. POCard: Remove redundant submit button for GC
- For GC: The "Submit to Supplier" button on the card just redirects to detail — remove it. The detail view already has the real submit button. Keep it only for TC (where it correctly sets PENDING_APPROVAL).

### C. PODetail: Actually send the email
- Wire `handleSubmitToSupplier` to call the `send-po` edge function (like the approval flow does), not just update the status field.

### D. Keep PODetail submit as the "manual" fallback
- Users who create a draft and want to review before sending can still submit from the detail view.

## Files to Modify

| File | Change |
|---|---|
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Rename "Submit PO" → "Create PO". Add "Create & Send" button. |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Pass `onCreateAndSend` callback alongside `onComplete` |
| `src/components/project/PurchaseOrdersTab.tsx` | Add `handleCreateAndSend` that creates PO + calls send-po. Remove POCard submit redirect for GC. |
| `src/components/purchase-orders/PODetail.tsx` | Fix `handleSubmitToSupplier` to call `send-po` edge function |
| `src/components/purchase-orders/POCard.tsx` | Remove submit button for non-TC users (or make it actually work) |

