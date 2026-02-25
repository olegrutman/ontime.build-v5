

# Fix: GC Cannot See PO Pricing Despite Being Material Responsible

## Root Cause

The existing PO (`PO-GCTEST-260223-0048`) has `pricing_owner_org_id` set to the **TC** organization (`ab07e031...`), even though the project contract specifies `material_responsibility = "GC"`. The GC org (`96a802b8...`) should be the pricing owner.

The PO creation code was fixed in a previous update to correctly derive `pricing_owner_org_id` from the contract's `material_responsibility` setting, but this PO was created **before** that fix was applied — so it has stale, incorrect data.

## Fix (Two Parts)

### 1. Fix Existing Data

Use the data insert tool to update the existing PO's `pricing_owner_org_id` to the correct GC organization:

```sql
UPDATE purchase_orders
SET pricing_owner_org_id = '96a802b8-72a4-42e5-aa00-b7c675a9bb62'
WHERE id = 'c7d15aba-2cf5-4364-a7b4-32ab6230253b';
```

### 2. Add Fallback in PO Card Visibility

Update `PurchaseOrdersTab.tsx` (line 422-424) to also grant pricing visibility to the PO's `created_by_org_id`. This is a safety net so the org that created the PO can always see its pricing, even if `pricing_owner_org_id` is somehow misconfigured:

```typescript
const isPricingOwner = po.pricing_owner_org_id === currentOrgId;
const isCreator = po.created_by_org_id === currentOrgId;
const isPoSupplier = (po.supplier as { organization_id?: string })?.organization_id === currentOrgId;
const canViewPricing = isPricingOwner || isPoSupplier || isCreator;
```

Apply the same fallback in `POCard.tsx` (line 98) where pricing total is calculated — it already receives `canViewPricing` as a prop, so no change needed there.

### Files Changed

| File | Change |
|------|--------|
| (Data fix) | UPDATE `pricing_owner_org_id` on the existing PO |
| `src/components/project/PurchaseOrdersTab.tsx` | Add `isCreator` fallback to pricing visibility check (line 422-424) |

### Result

After the fix, the GC will see the PO total price on the Purchase Orders tab instead of "Pricing managed by another party."

