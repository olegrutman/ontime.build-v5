

# Fix: Add Missing Category Values to Database Enum

## Problem Found

The edge function logs show the real issue:

```
Batch insert error at index 0: invalid input value for enum catalog_category: "Drywall"
Batch insert error at index 500: invalid input value for enum catalog_category: "FramingLumber"
```

The database `catalog_category` enum only contains these values:
- Dimensional, Engineered, Sheathing, Hardware, Fasteners, Other, Decking, Exterior, Interior, Roofing, Structural, Adhesives, Insulation, Concrete

But the edge function is mapping to new values that don't exist in the enum:
- `FramingLumber` (should replace "Dimensional")
- `Drywall` (new)
- `FramingAccessories` (new)

This caused 2 of 4 batches (1000 items) to fail, leaving only 700 items inserted.

## Solution

**Two options:**

### Option A: Add New Enum Values (Recommended)
Add the missing values to the `catalog_category` enum in the database:
```sql
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingLumber';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'Drywall';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingAccessories';
```

### Option B: Map to Existing Enum Values
Update the edge function to map to existing enum values:
- "FRAMING LUMBER" → "Dimensional" (existing)
- "DRYWALL" → "Other" or add new
- "FRAMING ACCESSORIES" → "Fasteners" (existing, close match)

**Recommendation: Option A** - The new category names are more descriptive and align with the updated inventory structure.

## Database Migration

```sql
-- Add new category values to the catalog_category enum
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingLumber';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'Drywall';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingAccessories';
```

## Steps to Implement

1. Run the database migration to add the new enum values
2. Re-upload the Excel file from Supplier Inventory page
3. Verify all 1700 items are imported correctly

## Expected Results After Fix

| Category | Item Count |
|----------|-----------|
| Decking | ~110 |
| Drywall | ~25 |
| Engineered | ~70 |
| Exterior | ~115 |
| FramingAccessories | ~120 |
| FramingLumber | ~480 |
| Hardware | ~780 |
| Sheathing | ~30 |
| Structural | ~60 |
| Other | ~10 |
| **Total** | **~1700** |

