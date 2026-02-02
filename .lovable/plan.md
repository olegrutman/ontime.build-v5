
# Plan: Fix Supplier Inventory Upload

## Problem

When a SUPPLIER organization user tries to upload inventory, they get "No supplier record found for this organization" because:

1. The `suppliers` table was originally designed to hold vendor records managed by GC organizations
2. When a SUPPLIER-type organization is created, no corresponding record is inserted into the `suppliers` table
3. The upload code looks for a supplier record linked to the organization and fails

**Current State:**
- SUPPLIER organization exists: `Supplier_Test` (id: `12b5d7de-...`)
- User with SUPPLIER role exists in that organization
- `suppliers` table is empty - no record linking to the organization

## Solution

**Auto-create a supplier record when a SUPPLIER organization exists** by updating the SupplierInventory page to create the supplier record on-demand if it doesn't exist.

This is the safest approach because:
- It fixes the issue for existing SUPPLIER organizations
- It works for new organizations without needing a database trigger migration
- It keeps the logic self-contained in the feature

---

## Changes

### 1. Update `src/pages/SupplierInventory.tsx`

Add a helper function that ensures a supplier record exists for the organization, creating one if needed:

```typescript
const ensureSupplierRecord = async (orgId: string, orgName: string) => {
  // First try to fetch existing supplier
  const { data: existingSupplier, error: fetchError } = await supabase
    .from('suppliers')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (existingSupplier) {
    return existingSupplier.id;
  }

  // Create supplier record for this SUPPLIER organization
  const { data: newSupplier, error: insertError } = await supabase
    .from('suppliers')
    .insert({
      organization_id: orgId,
      supplier_code: orgName.substring(0, 20).toUpperCase().replace(/\s+/g, '-'),
      name: orgName,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return newSupplier.id;
};
```

Use this function in:
- `fetchCatalogItems()` - to get or create the supplier record
- `handleUploadConfirm()` - to ensure the supplier exists before upserting items

### 2. Update RLS Policy for `suppliers` Table

Add a policy allowing SUPPLIER organization users to create their own supplier record:

```sql
-- Allow SUPPLIER orgs to create their own supplier record
CREATE POLICY "Supplier orgs can create own record"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    JOIN organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = organization_id
    AND o.type = 'SUPPLIER'
  )
);

-- Allow SUPPLIER org members to view their own supplier record
CREATE POLICY "Supplier orgs can view own record"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    JOIN organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = suppliers.organization_id
    AND o.type = 'SUPPLIER'
  )
);
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/SupplierInventory.tsx` | Modify | Add `ensureSupplierRecord()` helper and use it in fetch/upload |
| Database Migration | Create | Add RLS policies for SUPPLIER orgs to manage their own supplier record |

---

## Result After Fix

1. When a SUPPLIER user navigates to `/supplier/inventory`:
   - Page checks for existing supplier record
   - If none exists, creates one automatically using the organization's name
2. CSV upload works because the supplier record now exists
3. Existing SUPPLIER organizations get auto-fixed on first visit
4. New SUPPLIER organizations work seamlessly

---

## Technical Details

### `ensureSupplierRecord` Function Logic

```
┌─────────────────────────────────────┐
│   User visits /supplier/inventory   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Query: SELECT supplier WHERE       │
│  organization_id = currentOrg.id    │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   [Found]              [Not Found]
        │                   │
        │                   ▼
        │         ┌─────────────────────┐
        │         │ INSERT new supplier │
        │         │ - org_id = org.id   │
        │         │ - code = org.name   │
        │         │ - name = org.name   │
        │         └──────────┬──────────┘
        │                    │
        ▼                    ▼
┌─────────────────────────────────────┐
│     Return supplier.id              │
│     Proceed with catalog fetch/     │
│     upload operations               │
└─────────────────────────────────────┘
```

### RLS Policy Chain

Current policies for `suppliers`:
- GC_PM can create suppliers (for their vendor management)
- Org members can view suppliers

New policies to add:
- SUPPLIER orgs can create their own record (self-registration)
- SUPPLIER orgs can view their own record
