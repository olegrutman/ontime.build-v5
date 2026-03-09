

# Auto-Default to System Supplier When No Supplier Added During Project Setup

## Problem
When a project is created without adding a supplier in the wizard's Parties step, no supplier record exists. The readiness checklist then shows "Supplier not yet assigned" and the project cannot activate until the user manually designates one from the Team card. Users should not have to take this extra step — the system should default to the System Catalog supplier automatically.

## Plan

### 1. Auto-create System Supplier on project creation (`src/pages/CreateProject.tsx`)

After inviting all parties (step 5, ~line 199), check if any party has `role === 'SUPPLIER'`. If none, insert a `project_designated_suppliers` record with `invited_name: 'System Catalog'` and `status: 'active'` — identical to what `handleUseSystemCatalog` does in the TeamMembersCard.

```
// After party invite loop (~line 199):
const hasSupplierParty = data.parties.some(p => p.role === 'SUPPLIER');
if (!hasSupplierParty) {
  await supabase.from('project_designated_suppliers').insert({
    project_id: project.id,
    user_id: null,
    invited_email: null,
    invited_name: 'System Catalog',
    po_email: null,
    status: 'active',
    designated_by: user.id,
  });
}
```

### 2. Team card already handles display and change

The `TeamMembersCard` already:
- Shows the designated supplier row with "System Catalog" label
- Provides a "Change" button that opens `DesignateSupplierDialog`
- Supports replacing the system catalog with a real supplier

No changes needed to the Team card UI.

### 3. Readiness hook already handles it

The readiness hook checks `project_designated_suppliers` for `status === 'active'` and treats it as supplier assigned + accepted. No changes needed.

## Files to modify

| File | Change |
|------|--------|
| `src/pages/CreateProject.tsx` | Add auto-insert of system supplier when no supplier party is included |

One file, ~8 lines added. No database changes needed.

