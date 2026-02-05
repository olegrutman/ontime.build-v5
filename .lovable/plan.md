
# Plan: Allow Supplier to Delete an Estimate

## Summary

Add a delete capability for suppliers to remove their own estimates. Deletion is restricted to **DRAFT** status only -- estimates that have been submitted, approved, or rejected cannot be deleted.

---

## Current State

- **RLS Policy**: `supplier_estimates` has an `ALL` policy ("Suppliers manage own estimates") that already permits DELETE for the owning supplier org.
- **Cascade**: The `supplier_estimate_items.estimate_id` foreign key has ON DELETE CASCADE, so deleting an estimate automatically removes its line items.
- **No database migration needed** -- permissions are already in place.

---

## Changes

### 1. `src/pages/SupplierProjectEstimates.tsx` (Main Estimates Page)

**Add delete handler function:**
```tsx
const handleDeleteEstimate = async (estimateId: string) => {
  const { error } = await supabase
    .from('supplier_estimates')
    .delete()
    .eq('id', estimateId);

  if (error) {
    toast({ title: 'Error', description: 'Failed to delete estimate', variant: 'destructive' });
  } else {
    toast({ title: 'Deleted', description: 'Estimate has been deleted' });
    setSelectedEstimate(null);
    fetchEstimates();
  }
};
```

**Add confirmation state and dialog:**
- New state: `deleteConfirmId` (string or null)
- An AlertDialog that shows "Are you sure? This will permanently delete this estimate and all its line items."
- Confirm button triggers `handleDeleteEstimate`

**Add delete button in the detail sheet (line ~517-548):**
- Inside the DRAFT actions bar, add a destructive "Delete" button next to "Upload CSV" and "Submit for Review"
- The delete button opens the confirmation dialog

### 2. `src/components/project/SupplierEstimatesSection.tsx` (Project-Specific Section)

**Add delete mutation:**
```tsx
const deleteMutation = useMutation({
  mutationFn: async (estimateId: string) => {
    const { error } = await supabase
      .from('supplier_estimates')
      .delete()
      .eq('id', estimateId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: 'Deleted', description: 'Estimate deleted' });
    queryClient.invalidateQueries({
      queryKey: ['supplier-project-estimates', projectId, supplierOrgId]
    });
  },
  onError: () => {
    toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
  },
});
```

**Add confirmation state and AlertDialog:**
- New state: `deleteConfirmId` (string or null)
- AlertDialog for confirmation

**Add delete icon button per estimate row:**
- Only shown for DRAFT estimates
- Small Trash2 icon button on the right side of each estimate row

---

## Business Rules

| Estimate Status | Can Delete? |
|----------------|-------------|
| DRAFT          | Yes         |
| SUBMITTED      | No          |
| APPROVED       | No          |
| REJECTED       | No          |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/SupplierProjectEstimates.tsx` | Add delete handler, confirmation AlertDialog, delete button in detail sheet |
| `src/components/project/SupplierEstimatesSection.tsx` | Add delete mutation, confirmation AlertDialog, delete icon per DRAFT estimate row |

No database migrations required -- RLS and cascade are already configured correctly.
