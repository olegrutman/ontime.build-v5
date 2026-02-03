

# Fix: FC Sees Work Orders from Different Projects

## Problem

Field Crew users see work orders from **other projects** when viewing a project that should show no work orders.

### Root Cause

In `WorkOrderSummaryCard.tsx`, the query for FC/Supplier users fetches work orders by participation ID but **does not filter by the current project**:

```typescript
// Line 81-85: Gets ALL participations across ALL projects
const { data: participations } = await supabase
  .from('change_order_participants')
  .select('change_order_id')
  .eq('organization_id', currentOrgId)
  .eq('is_active', true);

// Line 103-106: Fetches work orders by those IDs - MISSING project filter!
const { data: workOrders } = await supabase
  .from('change_order_projects')
  .select('id, status')
  .in('id', participatedWOIds);  // ❌ No .eq('project_id', projectId)
```

This causes work orders from Project A to appear in Project B's summary if the FC participates in both.

---

## Solution

Add the missing `.eq('project_id', projectId)` filter to the work order query in `WorkOrderSummaryCard.tsx`.

### File: `src/components/project/WorkOrderSummaryCard.tsx`

**Change (line 103-106)**:

```typescript
// BEFORE
const { data: workOrders } = await supabase
  .from('change_order_projects')
  .select('id, status')
  .in('id', participatedWOIds);

// AFTER
const { data: workOrders } = await supabase
  .from('change_order_projects')
  .select('id, status')
  .eq('project_id', projectId)
  .in('id', participatedWOIds);
```

This ensures only work orders from the **current project** are counted, even if the FC participates in work orders on other projects.

---

## Additional Fix: FC Earnings Calculation

The FC earnings calculation also uses `participatedWOIds` without project filtering. While it won't show wrong data visually (it just sums labor), it should also be filtered for correctness.

**Change (line 122-125)**:

After fetching work orders with the project filter, use the filtered work order IDs for the FC hours query:

```typescript
// Get filtered work order IDs (only for current project)
const projectWorkOrderIds = (workOrders || []).map(wo => wo.id);

// Use filtered IDs for FC hours
const { data: fcHours } = await supabase
  .from('change_order_fc_hours')
  .select('change_order_id, hours, hourly_rate, labor_total')
  .in('change_order_id', projectWorkOrderIds);  // ← Use filtered IDs
```

---

## Summary

| Location | Issue | Fix |
|----------|-------|-----|
| Line 103-106 | Missing project filter | Add `.eq('project_id', projectId)` |
| Line 122-125 | Uses unfiltered IDs | Use filtered `projectWorkOrderIds` |
| Line 138 | Count uses unfiltered length | Use `projectWorkOrderIds.length` |

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| FC views Project A (has participations) | Shows work orders ✓ | Shows work orders ✓ |
| FC views Project B (no participations) | Shows Project A's work orders ❌ | Shows empty ✓ |
| FC earnings on Project B | Shows earnings from all projects ❌ | Shows $0 ✓ |

