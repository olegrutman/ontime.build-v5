

# Fix: TC Material Pricing Visibility + TC Cannot Add FC to CO

## Problem 1: TC sees material pricing in Financial sidebar when GC is responsible

In `CODetailPage.tsx` lines 439-444, the Financial sidebar shows "Materials cost" and "Materials billed" to TC **unconditionally** whenever `co.materials_needed` is true — it doesn't check `materials_responsible`. The materials panel table (line 146) correctly hides pricing columns when `materialsResponsible !== 'TC'`, but the sidebar financial summary leaks the totals anyway.

**Also**: The equipment section (lines 446-449) has the same problem — it shows equipment cost/billed to TC regardless of `equipment_responsible`.

### Fix in `src/components/change-orders/CODetailPage.tsx`

Lines 439-450: Wrap material and equipment financials in responsibility checks:

```tsx
{isTC && (
  <>
    {financials.fcLaborTotal > 0 && <FinRow label="FC cost to TC" value={financials.fcLaborTotal} muted />}
    <FinRow label="TC labor" value={financials.tcLaborTotal} />
    {co.materials_needed && co.materials_responsible === 'TC' && (
      <>
        <FinRow label="Materials cost" value={financials.materialsCost ?? 0} muted />
        <FinRow label="Materials billed" value={financials.materialsTotal} />
      </>
    )}
    {co.equipment_needed && co.equipment_responsible === 'TC' && (
      <>
        <FinRow label="Equipment cost" value={financials.equipmentCost ?? 0} muted />
        <FinRow label="Equipment billed" value={financials.equipmentTotal} />
      </>
    )}
    <div className="border-t border-border pt-2 mt-2">
      <FinRow label="Reviewed total" value={/* exclude GC-responsible materials/equipment */} bold />
    </div>
  </>
)}
```

Also update the "Reviewed total" calculation to exclude materials/equipment costs when the GC is responsible, so the TC only sees their own numbers.

## Problem 2: TC cannot add FC collaborator to CO

The `canRequestFCInput` condition on line 125-126:
```ts
const canRequestFCInput = !!co && isTC && co.assigned_to_org_id === myOrgId &&
  (co.status === 'shared' || co.status === 'rejected' || co.status === 'work_in_progress' || co.status === 'closed_for_pricing');
```

This requires the CO status to be `shared`, `work_in_progress`, `rejected`, or `closed_for_pricing`. If the CO is still in `draft` status, the FC request button won't appear. But more importantly — the GC created this CO and it may not have `assigned_to_org_id` set to the TC's org yet (it's only assigned after sharing).

The issue is that `co.assigned_to_org_id === myOrgId` may fail if the GC hasn't assigned it yet OR if the TC's `myOrgId` doesn't match. But looking at the network data, this CO was JUST created — it's in `draft` and hasn't been shared to TC yet.

However, the user says "TC can't add FC to the CO" which suggests the CO IS in a state where TC should be able to. The fix: also allow `canRequestFCInput` when the CO is in `draft` status AND the TC created it (`co.created_by_role === 'TC'` and `co.org_id === myOrgId`).

### Fix in `src/components/change-orders/CODetailPage.tsx`

Update line 125-126 to also allow TC-created draft COs:
```tsx
const canRequestFCInput = !!co && isTC && (
  (co.assigned_to_org_id === myOrgId && ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)) ||
  (co.org_id === myOrgId && co.status === 'draft')
);
```

## Files changed

| File | Change |
|------|--------|
| `src/components/change-orders/CODetailPage.tsx` | Gate material/equipment financials by `*_responsible === 'TC'`; allow TC to add FC on draft COs they created |

