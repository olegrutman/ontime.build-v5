
# CO/WO Field Mismatch & Bug Audit — Round 2

## Methodology
Compared every active trigger function, RPC, and client-side code against actual DB column names and frontend routes.

---

## Active Bugs Found

### BUG 1 — CRITICAL: Notification `action_url` uses wrong route `/projects/` instead of `/project/`

**Where:** Two locations:
1. **DB trigger** `notify_co_status_change()` — line: `'/projects/' || NEW.project_id || '/change-orders/' || NEW.id`
2. **Client code** `src/lib/coNotifications.ts` line 24: `` `/projects/${payload.project_id}/change-orders/${payload.co_id}` ``

**Impact:** Every CO notification (approved, rejected, submitted, shared) links to a 404 page because the actual route is `/project/:id/change-orders/:coId` (singular `project`).

**Fix:** Change `/projects/` to `/project/` in both locations.

### BUG 2 — LOW: Dead trigger functions reference non-existent columns/tables

These functions exist but have **NO active triggers** attached:
- `notify_change_order_status()` — references `NEW.created_by` (should be `created_by_user_id`), `NEW.rejection_notes` (should be `rejection_note`), `change_order_participants` table (doesn't exist in current schema), `ready_for_approval` status
- `cleanup_change_order_notification()` — uses uppercase `'APPROVED'`, `'REJECTED'` but statuses are lowercase
- `log_change_order_status_change()` — no issues but is dead code
- `create_change_order_checklist()` — references non-existent `change_order_checklist` table

**Impact:** None currently (dead code). But could cause confusion if someone tries to re-attach them.

**Fix:** Drop all 4 dead functions to prevent accidental attachment.

---

## Verified Working (No Issues)

| Component | Status |
|-----------|--------|
| `apply_co_contract_delta` trigger | All columns valid |
| `notify_co_status_change` trigger | Fixed (derives `is_tm` from project) |
| `request_fc_change_order_input` RPC | All columns valid |
| `complete_fc_change_order_input` RPC | All columns valid |
| `forward_change_order_to_upstream_gc` RPC | All columns valid, `to_role` values match |
| `co_grand_total` function | Valid |
| `_co_target_contract_id` function | Valid |
| TypeScript `ChangeOrder` type | Matches DB (extra TS fields like `combined_at` exist in DB too) |
| `COLineItem` type | Matches DB (DB has extra `task_index`, `pricing_mode`, `task_phase` not in TS — safe) |
| `COLaborEntry` type | Matches DB (DB has extra `gc_approved`, `gc_approved_at` — safe) |
| `COMaterialItem` type | Exact match |
| `COEquipmentItem` type | Exact match |
| `co_activity` table | Matches `COActivityEntry` type |
| `co_nte_log` table | Matches `CONTELogEntry` type |
| `change_order_collaborators` table | Matches `COCollaborator` type |

---

## Implementation Plan

### Step 1: Fix notification URLs (Bug 1)
- **Migration**: Update `notify_co_status_change()` to use `/project/` instead of `/projects/`
- **Code edit**: Fix `src/lib/coNotifications.ts` line 24

### Step 2: Drop dead functions (Bug 2)
- **Migration**: Drop `notify_change_order_status`, `cleanup_change_order_notification`, `log_change_order_status_change`, `create_change_order_checklist`
