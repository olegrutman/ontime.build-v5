
# Fix: Category Mapping Issue in Inventory Import

## Problem Identified

After importing the Excel file, ~695 items ended up with category "Other" instead of their correct categories. The affected categories are:
- Drywall
- Exterior Trim (Exterior)
- Framing Accessories
- Framing Lumber
- Sheathing (Sheating and Plywood)
- Structural Steel

Only these categories imported correctly:
- Decking (104 items)
- Engineered Wood (72 items)  
- Hardware (791 items)

## Root Cause Analysis

The issue is in the edge function's category mapping. When the XLSX library parses the Excel file, the column values may have subtle differences (encoding, whitespace, capitalization variants) that don't match the lookup keys.

The current `CATEGORY_MAP` in `supabase/functions/import-inventory/index.ts` only has lowercase keys like:
```typescript
"framing lumber": "FramingLumber"
```

But the Excel file has uppercase values like `FRAMING LUMBER`. While the code does `.toLowerCase().trim()`, there may be hidden characters (non-breaking spaces, Unicode variants) in the Excel data that aren't being handled.

Additionally, missing mappings for edge cases like empty strings or unusual formatting.

## Solution

### Step 1: Enhance Category Normalization

Update the `normalizeCategory` function to:
1. Handle multiple whitespace patterns
2. Remove non-printable characters
3. Add more fallback mappings
4. Log unrecognized categories for debugging

### Step 2: Expand Category Map

Add more robust mappings including:
- Exact uppercase variants
- Common typos (already have "sheating" typo)
- Single-word abbreviations

### Step 3: Add Debug Logging

Add console.log statements to track what category values are being parsed so we can identify any remaining issues.

## Code Changes

### File: `supabase/functions/import-inventory/index.ts`

```typescript
// Enhanced category normalization mapping
const CATEGORY_MAP: Record<string, string> = {
  // Decking
  "decking": "Decking",
  
  // Drywall
  "drywall": "Drywall",
  
  // Engineered Wood
  "engineered wood": "Engineered",
  "engineered": "Engineered",
  "engineeredwood": "Engineered",
  
  // Exterior Trim
  "exterior trim": "Exterior",
  "exterior": "Exterior",
  "exteriortrim": "Exterior",
  
  // Framing Accessories  
  "framing accessories": "FramingAccessories",
  "framingaccessories": "FramingAccessories",
  "framing_accessories": "FramingAccessories",
  
  // Framing Lumber
  "framing lumber": "FramingLumber",
  "framinglumber": "FramingLumber",
  "framing_lumber": "FramingLumber",
  
  // Hardware
  "hardware": "Hardware",
  
  // Sheathing (handle typo in file)
  "sheating and plywood": "Sheathing",
  "sheathing and plywood": "Sheathing", 
  "sheathing": "Sheathing",
  "sheatingandplywood": "Sheathing",
  "sheating": "Sheathing",
  
  // Structural Steel
  "structural steel": "Structural",
  "structural": "Structural",
  "structuralsteel": "Structural",
};

function normalizeCategory(category: string | undefined): string {
  if (!category) return "Other";
  
  // Remove all non-printable characters and normalize whitespace
  const cleaned = category
    .replace(/[^\x20-\x7E]/g, ' ')  // Replace non-ASCII with space
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .toLowerCase()
    .trim();
  
  // Try direct lookup first
  if (CATEGORY_MAP[cleaned]) {
    return CATEGORY_MAP[cleaned];
  }
  
  // Try without spaces
  const noSpaces = cleaned.replace(/\s/g, '');
  if (CATEGORY_MAP[noSpaces]) {
    return CATEGORY_MAP[noSpaces];
  }
  
  // Log unrecognized categories for debugging
  console.log(`Unrecognized category: "${category}" -> cleaned: "${cleaned}"`);
  
  return "Other";
}
```

### Additional Change: Log First Few Rows for Debugging

Add logging in the parsing loop to capture actual category values:

```typescript
// Log first 5 rows for debugging
if (uniqueItems.size < 5) {
  console.log(`Row sample - SKU: ${sku}, Raw Main Category: "${row["Main Category"]}", Normalized: ${category}`);
}
```

## Deployment Steps

1. Update the edge function code
2. Re-deploy the edge function
3. Re-import the Excel file from Supplier Inventory page
4. Verify category distribution is correct

## Expected Results After Fix

| Category | Expected Count |
|----------|---------------|
| Decking | ~110 |
| Drywall | ~25 |
| Engineered | ~70 |
| Exterior | ~115 |
| FramingAccessories | ~120 |
| FramingLumber | ~480 |
| Hardware | ~780 |
| Sheathing | ~30 |
| Structural | ~60 |
| Other | ~50 (uncategorized cedar/hemlock at end of file) |

## Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/import-inventory/index.ts` | Update normalizeCategory function and CATEGORY_MAP |
