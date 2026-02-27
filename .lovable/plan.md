

# Add Per-Item Pricing to Estimate Upload

## Pricing Logic

### Base formula (all items)
`unit_price = ext_price / quantity`

Where "unit" matches the UOM on the quote (each, box, roll, etc.).

### Engineered lumber (LVL, I-joists, glulam beams)
Suppliers price these by the linear foot, but sell them as individual pieces with a specific length. The extended price on the quote already reflects: `ext_price = quantity x length_ft x price_per_foot`.

So dividing ext_price by quantity gives you the **cost per piece** (which inherently includes the length). Example:
- LVL 1.75x11.25x24', Qty 4, ext_price $1,800
- unit_price = $1,800 / 4 = **$450 per piece** (which is 24ft x $18.75/ft)

No special formula needed -- `ext_price / quantity` already gives per-piece cost for engineered lumber.

### Boxed products (screws, connectors, nails)
The quote shows price per box, but sometimes you need the per-piece cost. We will add a `pieces_per_unit` column (optional) so users can enter how many pieces are in a box. Then:
- `price_per_piece = unit_price / pieces_per_unit`

Example:
- GRK Screws, 12 BX, ext_price $720
- unit_price = $720 / 12 = **$60 per box**
- If user enters pieces_per_unit = 100, then price_per_piece = $60 / 100 = **$0.60 per screw**

This `pieces_per_unit` field is optional -- when left blank, only the per-UOM price is shown.

## Technical Changes

### 1. Edge Function: Extract ext_price from PDF
**File:** `supabase/functions/parse-estimate-pdf/index.ts`

- Update SYSTEM_PROMPT to instruct AI to also extract `ext_price` (extended/line total) for each item
- Add `ext_price` field to the tool schema
- Calculate `unit_price = ext_price / quantity` in the response validation step
- Pass `unit_price` and `ext_price` through in each item

### 2. CSV Parser: Extract pricing columns
**File:** `src/lib/parseEstimateCSV.ts`

- Add `unit_price` and `ext_price` to `ParsedEstimateItem` interface
- Detect price columns in CSV headers (price, ext_price, total, amount, cost)
- Calculate `unit_price = ext_price / quantity` when ext_price column exists

### 3. Pack Review Step: Show pricing
**File:** `src/components/estimate-upload/PackReviewStep.tsx`

- Add "Unit Price" and "Ext Price" columns to the review table
- Format values as currency
- Show pack subtotal at the bottom of each accordion

### 4. Catalog Match Step: Pass pricing through
**File:** `src/components/estimate-upload/CatalogMatchStep.tsx`

- Add `unit_price` and `ext_price` to `MatchedItem` interface
- Display unit price next to each matched item

### 5. Upload Wizard: Save pricing
**File:** `src/components/estimate-upload/EstimateUploadWizard.tsx`

- Use parsed `unit_price` instead of hardcoded `0`
- Calculate `line_total = unit_price * quantity` when saving to `supplier_estimate_items`

### 6. Database: Add pieces_per_unit column
**Migration SQL:**

Add an optional `pieces_per_unit` integer column to `supplier_estimate_items` for boxed/bundled products where users want per-piece cost visibility. This is for future use in the estimate detail view (not part of the upload wizard itself).

```sql
ALTER TABLE supplier_estimate_items
  ADD COLUMN IF NOT EXISTS pieces_per_unit integer;
```

## Files Modified
1. `supabase/functions/parse-estimate-pdf/index.ts` -- extract ext_price, calculate unit_price
2. `src/lib/parseEstimateCSV.ts` -- add pricing fields to parser
3. `src/components/estimate-upload/PackReviewStep.tsx` -- show pricing columns
4. `src/components/estimate-upload/CatalogMatchStep.tsx` -- pass pricing through
5. `src/components/estimate-upload/EstimateUploadWizard.tsx` -- save unit_price
6. Database migration -- add pieces_per_unit column
