

# Fix All CO System Bugs — Full Plan

## Bugs to Fix

### CRITICAL

**C1 — TC/FC-created COs have no `assigned_to_org_id`, blocking submission**
`src/components/change-orders/wizard/COWizard.tsx` — When TC creates a CO, the wizard never sets `assignedToOrgId` (no GC picker). The `doSubmit` in COStatusActions checks `co.assigned_to_org_id` and errors out. Same for FC.
**Fix:** Auto-resolve the GC org (project owner) and set `assigned_to_org_id` automatically for TC/FC-created COs during wizard submission.

**C2 — FC collaborator not created after CO creation**
`src/components/change-orders/wizard/COWizard.tsx` — When TC toggles "FC input needed" and selects an FC org via `fcOrgId`, no `co_collaborators` record is inserted. The FC never gets access.
**Fix:** After CO + line items insert, if `data.fcInputNeeded && data.fcOrgId`, insert a `co_collaborators` record with `status: 'active'`.

**C3 — Notification routing sends to wrong org**
`src/components/change-orders/COStatusActions.tsx`:
- `CHANGE_APPROVED` (line 258): notifies `co.org_id` (creator) — if GC created and approves, GC notifies themselves. Should notify `co.assigned_to_org_id`.
- `CHANGE_REJECTED` (line 278): same — notifies creator instead of the submitter (`assigned_to_org_id`).
- `CO_ACKNOWLEDGED` (line 334): GC acknowledges, notifies `co.org_id` (themselves if GC created). Should notify `co.assigned_to_org_id`.
**Fix:** Change all three to `notifyOrg(co.assigned_to_org_id, ...)`.

### MEDIUM

**M1 — `selectedFcName` resolves wrong field**
`src/components/change-orders/wizard/StepConfig.tsx` line 60: `selectedFcName` looks up `data.assignedToOrgId` in `fcMembers`. Should use `data.fcOrgId`.
**Fix:** Change to `fcMembers.find(m => m.org_id === data.fcOrgId)?.org_name`.

**M2 — StepReview doesn't show selected FC org**
`src/components/change-orders/wizard/StepReview.tsx` line 76: Shows "Field crew input: Requested" but doesn't show which FC was selected.
**Fix:** Resolve `data.fcOrgId` to org name and display it.

**M3 — "Send to TC" button label is hardcoded**
`src/components/change-orders/COStatusActions.tsx` line 433: Says "Send to TC (Work in Progress)" instead of using the assigned org name.
**Fix:** Pass `assignedOrgName` into COStatusActions and use it in the button label.

### LOW

**L1 — `contracted` status is a dead end**
No UI action transitions a CO to `contracted`. It exists in the status machine but is unreachable. No fix needed now — just documenting.

## Changes by File

### `src/components/change-orders/wizard/COWizard.tsx`
1. Before CO insert, auto-resolve GC org for TC/FC roles by querying `projects.organization_id`
2. Set `assigned_to_org_id` to the project's GC org when role is TC or FC
3. After line items insert succeeds, if `data.fcInputNeeded && data.fcOrgId`, insert `co_collaborators` row

### `src/components/change-orders/wizard/StepConfig.tsx`
4. Line 60: Fix `selectedFcName` to use `data.fcOrgId` instead of `data.assignedToOrgId`

### `src/components/change-orders/wizard/StepReview.tsx`
5. Add query to resolve `data.fcOrgId` to org name and display in review

### `src/components/change-orders/COStatusActions.tsx`
6. Line 258: Change `notifyOrg(co.org_id, 'CHANGE_APPROVED', ...)` → `notifyOrg(co.assigned_to_org_id, 'CHANGE_APPROVED', ...)`
7. Line 278: Change `notifyOrg(co.org_id, 'CHANGE_REJECTED')` → `notifyOrg(co.assigned_to_org_id, 'CHANGE_REJECTED')`
8. Line 334: Change `notifyOrg(co.org_id, 'CO_ACKNOWLEDGED')` → `notifyOrg(co.assigned_to_org_id, 'CO_ACKNOWLEDGED')`
9. Accept `assignedOrgName` prop and use in "Send to TC" button label

### `src/components/change-orders/CODetailPage.tsx`
10. Pass `assignedOrgName` to COStatusActions

| File | Changes |
|------|---------|
| `COWizard.tsx` | Auto-resolve GC org for TC/FC, create FC collaborator on submission |
| `StepConfig.tsx` | Fix `selectedFcName` lookup |
| `StepReview.tsx` | Show selected FC org name |
| `COStatusActions.tsx` | Fix 3 notification targets, use org name in button label |
| `CODetailPage.tsx` | Pass assignedOrgName to status actions |

