

# Plan: Fix Duplicate SKU Error in CSV Upload

## Problem

When uploading a CSV file, you get this error:
> "ON CONFLICT DO UPDATE command cannot affect row a second time"

This occurs because your CSV contains **duplicate SKUs** - the same product SKU appears on multiple rows. PostgreSQL's upsert operation can't handle updating the same row twice in a single batch.

---

## Solution

**De-duplicate the CSV data before upserting**, keeping only the last occurrence of each SKU (to allow manual corrections in the CSV to take precedence).

---

## Changes

### Update `src/pages/SupplierInventory.tsx`

Add a de-duplication step before the upsert:

**Before (current code):**
```typescript
const itemsToInsert = csvPreview.map(row => ({
  supplier_id: supplierId,
  supplier_sku: row.supplier_sku,
  // ... other fields
}));

await supabase.from('catalog_items').upsert(itemsToInsert, { 
  onConflict: 'supplier_id,supplier_sku' 
});
```

**After (with de-duplication):**
```typescript
// De-duplicate by SKU - keep the LAST occurrence (allows overrides in CSV)
const uniqueItems = new Map();
csvPreview.forEach(row => {
  uniqueItems.set(row.supplier_sku, {
    supplier_id: supplierId,
    supplier_sku: row.supplier_sku,
    // ... other fields
  });
});

const itemsToInsert = Array.from(uniqueItems.values());

// Show warning if duplicates were found
const duplicatesRemoved = csvPreview.length - itemsToInsert.length;
if (duplicatesRemoved > 0) {
  console.log(`Removed ${duplicatesRemoved} duplicate SKUs`);
}

await supabase.from('catalog_items').upsert(itemsToInsert, { 
  onConflict: 'supplier_id,supplier_sku' 
});
```

---

## Additional UX Improvement

Show a warning in the preview dialog when duplicates are detected:

```typescript
// In the preview section, detect duplicates
const skuCounts = csvPreview.reduce((acc, row) => {
  acc[row.supplier_sku] = (acc[row.supplier_sku] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const duplicateSkus = Object.entries(skuCounts)
  .filter(([_, count]) => count > 1)
  .map(([sku]) => sku);

// Show warning banner in preview dialog
{duplicateSkus.length > 0 && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Found {duplicateSkus.length} duplicate SKUs. 
      Last occurrence of each will be used.
    </AlertDescription>
  </Alert>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/SupplierInventory.tsx` | Add de-duplication logic in `handleUploadConfirm()` and add duplicate warning in preview UI |

---

## Result After Fix

1. Duplicate SKUs in CSV are automatically handled (last row wins)
2. User sees a warning if duplicates are detected
3. Upload completes successfully
4. No data loss - all unique products are imported

