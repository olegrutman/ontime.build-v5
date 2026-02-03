

# Fix: GC Cannot See Materials and Finalize Work Order

## Root Cause Analysis

Three interconnected issues were identified:

### Issue 1: RLS Policy Blocks GC from Seeing PO Line Items

The current `po_line_items` SELECT policy only allows:
- Users in the same organization as the PO owner
- Users in the supplier's organization

Since the PO is owned by the Trade Contractor (TC), the General Contractor (GC) cannot read the line items. This is why the Materials panel shows nothing for the GC.

**Database state:**
- PO `5545e311-2049-4589-a47a-db0c7237c1e3` has `organization_id = TC (ab07e031-...)`
- GC user is in `organization_id = GC (96a802b8-...)`
- RLS check `user_in_org(auth.uid(), po.organization_id)` returns FALSE for GC

### Issue 2: Checklist `materials_priced` Still False

The checklist shows `materials_priced: false` even though materials pricing was locked. The code change I made hasn't been executed yet because:
- Materials were locked before the code was deployed
- A manual fix is needed for this work order

### Issue 3: `material_total` Not Calculated

The `change_order_projects.material_total` is `0.00` even though:
- The linked PO has priced items ($7,350 subtotal)
- 15% markup is configured ($1,102.50)
- Expected total: $8,452.50

The `lockMaterialsPricing` mutation should calculate and store the final materials total.

---

## Solution

### Step 1: Fix RLS Policy for `po_line_items` SELECT

Allow project team members (GC) to see line items for POs linked to work orders they can access.

```sql
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "PO participants can view line items" ON po_line_items;

-- Create new policy that includes project participants via work order links
CREATE POLICY "PO participants can view line items" ON po_line_items
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id
      AND (
        -- Original: user in PO's org
        user_in_org(auth.uid(), po.organization_id)
        -- Original: supplier
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
        )
        -- NEW: project team members for POs linked to work orders
        OR EXISTS (
          SELECT 1 FROM change_order_projects cop
          JOIN project_team pt ON pt.project_id = cop.project_id
          WHERE cop.linked_po_id = po.id
          AND pt.user_id = auth.uid()
        )
      )
    )
  );
```

### Step 2: Update `lockMaterialsPricingMutation` to Calculate and Store Material Total

Modify the mutation to:
1. Fetch the linked PO subtotal
2. Calculate markup based on type (percent or lump sum)
3. Store the final `material_total` on `change_order_projects`
4. Mark `materials_priced = true` in checklist

**File:** `src/hooks/useChangeOrderProject.ts`

```text
Current flow:
  1. Set materials_pricing_locked = true
  2. Set materials_priced = true in checklist

New flow:
  1. Fetch linked PO's subtotal
  2. Calculate markup (percent or lump_sum)
  3. Calculate total = subtotal + markup
  4. Update change_order_projects with:
     - materials_pricing_locked = true
     - materials_locked_at
     - material_total = calculated total
  5. Set materials_priced = true in checklist
```

### Step 3: Update `final_price` Calculation

The `final_price` should be recalculated when materials are locked. Ensure the update also sets:
```sql
final_price = labor_total + material_total + equipment_total
```

---

## Implementation Files

| Type | File | Change |
|------|------|--------|
| Database | Migration | Update RLS policy for `po_line_items` to allow project team access |
| Code | `src/hooks/useChangeOrderProject.ts` | Calculate `material_total` in `lockMaterialsPricingMutation` |

---

## Technical Details

### Updated `lockMaterialsPricingMutation` Logic

```typescript
mutationFn: async () => {
  if (!changeOrderId || !changeOrder?.linked_po_id) 
    throw new Error('Invalid state');

  // 1. Fetch PO line items to calculate subtotal
  const { data: items } = await supabase
    .from('po_line_items')
    .select('line_total')
    .eq('po_id', changeOrder.linked_po_id);

  const subtotal = (items || []).reduce(
    (sum, i) => sum + (i.line_total || 0), 
    0
  );

  // 2. Calculate markup
  const markup = changeOrder.material_markup_type === 'percent'
    ? subtotal * (changeOrder.material_markup_percent || 0) / 100
    : (changeOrder.material_markup_amount || 0);

  const materialTotal = subtotal + markup;

  // 3. Get current totals for final_price calculation
  const laborTotal = changeOrder.labor_total || 0;
  const equipmentTotal = changeOrder.equipment_total || 0;
  const finalPrice = laborTotal + materialTotal + equipmentTotal;

  // 4. Update change_order_projects
  await supabase
    .from('change_order_projects')
    .update({ 
      materials_pricing_locked: true,
      materials_locked_at: new Date().toISOString(),
      material_total: materialTotal,
      final_price: finalPrice,
    })
    .eq('id', changeOrderId);

  // 5. Mark materials_priced in checklist
  await supabase
    .from('change_order_checklist')
    .update({ materials_priced: true })
    .eq('change_order_id', changeOrderId);
};
```

---

## Verification Steps

After deploying:

1. **GC View Test:**
   - Log in as GC
   - Navigate to the work order page
   - Verify the Materials panel shows the line items with pricing
   - Verify the checklist shows "Materials priced" as complete

2. **Pricing Total Test:**
   - Confirm `material_total` shows $8,452.50 (or correct calculated value)
   - Confirm `final_price` includes the material total
   - Confirm GC can click "Finalize Work Order" button

3. **New Lock Test:**
   - Create a new work order with materials
   - Add materials via Product Picker
   - Price materials as supplier
   - Lock pricing as TC
   - Verify material_total is calculated and stored
   - Verify checklist updates automatically

