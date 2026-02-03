

# Work Order Materials and Equipment Refinements

## Summary of Changes

This plan addresses three specific improvements to the work order page:

1. **Use only the Product Picker for materials** - Remove the manual materials entry panel since materials should only be added via the linked PO (Product Picker)
2. **Add "Equipment Priced" indicator** - When TC adds equipment with pricing, show a visual checkmark badge
3. **Auto-activate supplier** - When the "Materials Needed" toggle is turned ON, automatically activate the supplier as a participant

---

## Changes

### 1. Remove Manual MaterialsPanel from Work Order Page

**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**

Remove the `MaterialsPanel` component from the main content area. Since materials now come exclusively through the Product Picker (linked PO), there's no need for manual material entry.

**Current code (lines 157-169):**
```tsx
{/* Materials */}
{changeOrder.requires_materials && (isTC || isSupplier || isGC) && (
  <MaterialsPanel
    materials={materials}
    isEditable={isEditable}
    canViewCosts={isTC || isGC}
    isTC={isTC}
    isSupplier={isSupplier}
    onAddMaterial={addMaterial}
    onUpdateMaterial={updateMaterial}
    onLockSupplierPricing={lockSupplierPricing}
  />
)}
```

**Action:** Remove this entire block. The `MaterialResourceToggle` component in the sidebar already handles material management via the Product Picker.

---

### 2. Add "Equipment Priced" Badge and Checklist Update

**File: `src/components/change-order-detail/EquipmentPanel.tsx`**

Add a "Priced" badge to equipment items that have pricing entered (matching the style used elsewhere).

**Current code (lines 147-164):**
```tsx
{equipment.map((item) => (
  <div
    key={item.id}
    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
  >
    <div className="flex-1">
      <p className="font-medium text-sm">{item.description}</p>
      <p className="text-xs text-muted-foreground">
        {item.pricing_type === 'daily'
          ? `${item.days} day(s) @ $${item.daily_rate}/day`
          : 'Flat rate'}
      </p>
    </div>
    {canViewCosts && (
      <span className="font-medium">${(item.total_cost || 0).toFixed(2)}</span>
    )}
  </div>
))}
```

**New code:**
```tsx
{equipment.map((item) => {
  const isPriced = item.total_cost && item.total_cost > 0;
  return (
    <div
      key={item.id}
      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{item.description}</p>
          {isPriced && (
            <Badge variant="secondary" className="gap-1">
              <Check className="w-3 h-3" />
              Priced
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.pricing_type === 'daily'
            ? `${item.days} day(s) @ $${item.daily_rate}/day`
            : 'Flat rate'}
        </p>
      </div>
      {canViewCosts && (
        <span className="font-medium">${(item.total_cost || 0).toFixed(2)}</span>
      )}
    </div>
  );
})}
```

Also add imports for `Badge` and `Check` icon.

---

### 3. Auto-Activate Supplier When Materials Toggle is ON

**File: `src/hooks/useChangeOrderProject.ts`**

Modify the `toggleMaterialsMutation` to automatically activate the first available supplier when materials are enabled.

**Current code (lines 1009-1032):**
```typescript
// Toggle materials requirement
const toggleMaterialsMutation = useMutation({
  mutationFn: async (requiresMaterials: boolean) => {
    if (!changeOrderId) throw new Error('Invalid state');

    const { error } = await supabase
      .from('change_order_projects')
      .update({ requires_materials: requiresMaterials })
      .eq('id', changeOrderId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
    toast({ title: 'Materials requirement updated' });
  },
  ...
});
```

**New code:**
```typescript
// Toggle materials requirement
const toggleMaterialsMutation = useMutation({
  mutationFn: async (requiresMaterials: boolean) => {
    if (!changeOrderId || !user) throw new Error('Invalid state');

    const { error } = await supabase
      .from('change_order_projects')
      .update({ requires_materials: requiresMaterials })
      .eq('id', changeOrderId);

    if (error) throw error;

    // Auto-activate supplier when materials are enabled
    if (requiresMaterials && availableSuppliers.length > 0) {
      // Check if a supplier is already active
      const existingSupplierParticipant = participants.find(
        p => p.role === 'SUPPLIER' && p.is_active
      );
      
      if (!existingSupplierParticipant) {
        // Activate the first available supplier
        const { error: activateError } = await supabase
          .from('change_order_participants')
          .upsert({
            change_order_id: changeOrderId,
            organization_id: availableSuppliers[0].id,
            role: 'SUPPLIER',
            is_active: true,
            invited_by: user.id,
          });

        if (activateError) {
          console.error('Failed to auto-activate supplier:', activateError);
          // Don't throw - just log the error
        }
      }
    }
  },
  onSuccess: (_, requiresMaterials) => {
    queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
    queryClient.invalidateQueries({ queryKey: ['change-order-participants', changeOrderId] });
    
    if (requiresMaterials) {
      toast({ title: 'Materials enabled - Supplier activated' });
    } else {
      toast({ title: 'Materials requirement updated' });
    }
  },
  ...
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Remove the `MaterialsPanel` component rendering (lines 157-169) |
| `src/components/change-order-detail/EquipmentPanel.tsx` | Add "Priced" badge with checkmark icon to priced equipment items |
| `src/hooks/useChangeOrderProject.ts` | Update `toggleMaterialsMutation` to auto-activate supplier when materials enabled |

---

## Visual Result

### Equipment Panel with "Priced" Badge
```
┌─────────────────────────────────────────────────────┐
│ Equipment / Machinery                    [+ Add]    │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Scissor Lift  [✓ Priced]              $450.00  │ │
│ │ 3 day(s) @ $150/day                            │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Generator     [✓ Priced]              $200.00  │ │
│ │ Flat rate                                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Total Equipment                         $650.00    │
└─────────────────────────────────────────────────────┘
```

### Materials Flow (Product Picker Only)
```
Resource Requirements Card (Sidebar)
┌─────────────────────────────────────────────────────┐
│ 📦 Materials Needed              [Toggle Switch]   │
│    GC pays for materials                           │
│                                                     │
│  [+ Add Materials via Product Picker]              │
│  ─or─                                              │
│  ┌───────────────────────────────────────────────┐ │
│  │ Linked PO: PO-001234    Status: PRICED        │ │
│  │ 5 items • $1,234.50                           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│ 🔧 Equipment Needed              [Toggle Switch]   │
│    TC pays for equipment                           │
└─────────────────────────────────────────────────────┘
```

---

## Benefits

1. **Simplified UI** - Removes duplicate material entry options, making the workflow clearer
2. **Consistent data source** - All materials come from the structured Product Picker / PO system
3. **Visual feedback** - Users can clearly see when equipment has been priced
4. **Automatic workflow** - Supplier is ready to receive POs as soon as materials are needed

