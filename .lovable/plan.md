
# Bug Analysis: Auto-Create Linked Schedule Tasks from SOV

## Current Implementation Status

Looking at the database:
- **SOV Items**: Many exist with duplicate names across contracts (e.g., "1st Floor Walls Frame" × 2)
- **Schedule Items**: Only 1 manually-created item exists ("tttt") with `sov_item_id: null`
- **Conclusion**: The auto-creation feature was added AFTER existing SOVs were created, so no linked tasks exist yet

---

## Bugs Found

### 🔴 Bug #1: No Cleanup of Old Schedule Tasks on SOV Regeneration

**Location**: `useContractSOV.ts` lines 567-570

When `createAllSOVs` regenerates SOVs:
```ts
// Deletes SOV items
await supabase.from('project_sov_items').delete().in('sov_id', existingSovIds);
await supabase.from('project_sov').delete().in('id', existingSovIds);
// ❌ MISSING: Delete associated schedule tasks
```

**Impact**: If user regenerates SOVs, orphaned schedule tasks remain with invalid `sov_item_id` references.

---

### 🔴 Bug #2: Duplicate Schedule Tasks for Multi-Contract Projects

**Location**: `useContractSOV.ts` lines 573-617

When a project has multiple contracts (GC→TC, TC→FC):
- Same template generates same item names for both
- Each contract creates its own schedule tasks with identical titles
- Result: 2× schedule tasks like "1st Floor Walls Frame"

**Example**: For this project:
```
| SOV Item Name              | Count |
|---------------------------|-------|
| 1st Floor Walls Frame     | 2     |
| 2nd Floor Trusses         | 2     |
| Windows Install           | 2     |
...
```

Each creates a schedule task = **70+ duplicate tasks**.

---

### 🟡 Bug #3: Code Duplication in UploadSOVDialog

**Location**: `UploadSOVDialog.tsx` lines 154-173

Schedule task creation is implemented inline instead of using the shared `createScheduleItemsFromSOVItems` helper. This:
- Creates maintenance burden
- Can lead to inconsistencies if one is updated and not the other

---

### 🟡 Bug #4: No Deduplication Strategy

There's no decision on whether:
- Each contract's SOV items should have separate schedule tasks (current behavior)
- Same-named items across contracts should share one schedule task
- Only the "primary" contract's SOV should create schedule tasks

---

## Recommended Fixes

### Fix #1: Delete Associated Schedule Tasks
Add before SOV deletion:
```ts
// Get SOV item IDs that will be deleted
const { data: sovItemIds } = await supabase
  .from('project_sov_items')
  .select('id')
  .in('sov_id', existingSovIds);

// Delete linked schedule tasks
if (sovItemIds?.length) {
  await supabase
    .from('project_schedule_items')
    .delete()
    .in('sov_item_id', sovItemIds.map(i => i.id));
}
```

### Fix #2: Create Schedule Tasks Only for Primary Contract
Add flag to create schedule tasks only for the "primary" contract (typically GC→TC, not TC→FC):
```ts
// Only create schedule tasks for the first contract in the chain
const isPrimaryContract = contract.to_role === 'General Contractor';
if (isPrimaryContract && insertedItems) {
  await createScheduleItemsFromSOVItems(projectId, insertedItems);
}
```

### Fix #3: Use Shared Helper in UploadSOVDialog
Import and use the helper instead of inline code.

### Fix #4: Add Migration for Existing Projects
Create a one-time script to generate schedule tasks for projects that already have SOVs but no linked schedule tasks.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useContractSOV.ts` | Fix #1, #2: cleanup + primary contract filter |
| `src/components/sov/UploadSOVDialog.tsx` | Fix #3: use shared helper |

---

## Questions Before Implementing

1. **Should each contract have its own schedule tasks, or share one set?**
   - Option A: Each contract = separate tasks (current, causes duplicates)
   - Option B: Only primary contract creates tasks (recommended)

2. **Should we backfill schedule tasks for existing SOVs in this project?**
