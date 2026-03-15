

# Fix: POs Created via "Create & Send" Don't Show in Sender's PO List

## Root Cause

In `PurchaseOrdersTab.tsx` `handleCreateAndSend` (line 487), if the edge function call fails for any reason, `throw sendErr` skips both `setWizardOpen(false)` (line 492) and `fetchPurchaseOrders()` (line 493). The PO is already created in the database at that point, but the UI never refreshes to show it. The wizard stays open and shows an error toast, leaving the user confused.

The `finally` block (line 498) only resets `setIsSending(false)` — it doesn't close the wizard or refresh the list.

## Fix

**`src/components/project/PurchaseOrdersTab.tsx`** — Restructure `handleCreateAndSend` so that:

1. Move `setWizardOpen(false)` and `fetchPurchaseOrders()` into the `finally` block (alongside `setIsSending(false)`), ensuring they always execute after PO creation
2. Make the edge function call non-throwing: if `sendErr` occurs, show a warning toast ("PO created but email failed") instead of throwing, so the flow continues gracefully
3. Only `throw` for errors that happen BEFORE the PO is created (e.g., insert failure)

Specifically, around lines 481-499:
- After the PO + line items are created successfully, wrap the send-po invocation in its own try-catch
- If sending fails, show a warning toast but don't throw
- Always close wizard and refresh PO list in the `finally` block

