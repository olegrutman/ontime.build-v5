

# Supplier PO Pricing Button Flow Fix

## What Changes

### 1. Rename "Add Pricing" button to "Add / Edit Pricing"
When a supplier sees a PO in SUBMITTED or PRICED status, the button label should read **"Add / Edit Pricing"** instead of just "Add Pricing".

### 2. Separate Save from status change
Currently, saving pricing immediately sets the PO to PRICED. Instead:
- Show a **"Save Pricing"** button while editing that saves prices without changing status
- Show a separate **"Lock Pricing"** button that saves AND sets status to PRICED
- This gives suppliers a chance to save their work and come back to it

### 3. Allow supplier to re-edit pricing when PRICED
Currently, the supplier can only edit pricing when status is SUBMITTED. Extend this so the supplier can also click "Add / Edit Pricing" when status is PRICED to go back and adjust.

### 4. Block all pricing edits after ORDERED
Once a PO reaches ORDERED status or beyond, no pricing editing is allowed. The "Add / Edit Pricing" button will not appear.

## Technical Details

**File:** `src/components/purchase-orders/PODetail.tsx`

**Changes to action buttons (lines 491-497, 499-523):**
- Merge the SUBMITTED and PRICED supplier buttons into one block: show "Add / Edit Pricing" button when `effectiveIsSupplier && (status === 'SUBMITTED' || status === 'PRICED')`
- When `editingPrices` is true, show two buttons:
  - "Save Pricing" -- calls a new `handleSavePricesOnly` that updates line items and PO totals but does NOT change the status
  - "Lock Pricing" -- calls existing `handleSavePrices` which saves AND sets status to PRICED

**Changes to `usePOPricingVisibility` hook:**
- Update `canEditPricing` to return true when supplier and status is SUBMITTED **or** PRICED (currently only SUBMITTED)

**File:** `src/hooks/usePOPricingVisibility.ts` (line 41)
- Change: `const canEditPricing = isSupplier && po.status === 'SUBMITTED';`
- To: `const canEditPricing = isSupplier && (po.status === 'SUBMITTED' || po.status === 'PRICED');`

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePOPricingVisibility.ts` | Allow pricing edit in PRICED status |
| `src/components/purchase-orders/PODetail.tsx` | Rename button, add Save vs Lock, show edit button for PRICED |

## What Does NOT Change
- PO status flow order
- How pricing data is stored
- Non-supplier user experience
- Any other wizard or component

