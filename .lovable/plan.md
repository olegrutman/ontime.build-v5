
# Change Order / Work Order — End-to-End Audit Report

## Test Scenarios Analyzed

I traced every CO lifecycle path through code + database: GC→TC flow, TC→GC flow, FC→TC→GC flow, FC collaboration, and all status transitions. Here's what works and what doesn't.

---

## What Works

1. **GC Creates CO → Sends to TC as WIP** — The `canSendToWIP` button correctly appears for GC on draft COs with an assigned TC. Status transitions `draft → work_in_progress`. RLS allows this (owner org policy).

2. **TC Creates CO → Submits to GC** — TC is the `org_id` owner, so RLS "Owner org can update" allows all transitions. `canSubmit` correctly shows for TC on their own drafts.

3. **GC Approves / Rejects** — `canApprove` and `canReject` correctly gate on `isGC && status === 'submitted' && co.org_id === currentOrgId`. Rejection writes `rejection_note` and reverts.

4. **TC Involves FC** — `requestFCInput` RPC exists and works. The CODetailLayout has logic to invite FC from the project's FC orgs. COSidebar renders the FC request panel.

5. **FC Collaborator Accepts** — `COAcceptBanner` correctly shows for invited FC collaborators.

6. **FC Pricing Submit** — `canSubmitFCPricing` correctly gates on `isFC && isActiveCollaborator && status === 'closed_for_pricing'`.

7. **TC Forwards FC-created CO to GC** — The `forwardsToGC` logic and `forward_change_order_to_upstream_gc` RPC handle this path.

8. **Completion Flow** — TC marks completed → GC acknowledges → ready for invoicing. Correctly gated.

---

## Bugs Found

### BUG 1 — CRITICAL: TC Cannot Submit GC-Created CO (RLS Mismatch)

**What happens:** When GC creates a CO and assigns it to TC, the TC sees a "Submit for approval" button even in `draft` status. Clicking it fails with "You don't have permission to submit this change order."

**Root cause:** The UI (`canSubmit` at line 360) allows TC to submit from `draft` status, but the RLS UPDATE policy "Assigned org can work active change orders" only permits the assigned org to update when status is in `[shared, rejected, combined, work_in_progress, closed_for_pricing]`. **`draft` is not included.**

The correct flow is: GC must first send the CO to WIP (`work_in_progress`), then TC can work on it and submit. But the UI doesn't enforce this — it shows the submit button prematurely.

**Fix:** Remove `'draft'` from the `canSubmit` condition for cases where the TC is NOT the creator. Specifically:
```
const isOwnerOrg = co.org_id === currentOrgId;
const canSubmit = (isTC || isFC) && !isAnyCollaborator && isOwnerOrg 
  ? (status === 'draft' || status === 'shared' || ...) 
  : (status === 'shared' || status === 'work_in_progress' || ...);
```
TC should only submit from `draft` if they created the CO (they're `org_id`). If they're the `assigned_to_org_id`, they must wait for GC to send it to WIP first.

### BUG 2 — CRITICAL: FC-Created CO Routes to GC Instead of Hiring TC

**What happens:** When an FC creates a CO via the Picker v3, it looks up the GC on the project and sets `assigned_to_org_id = GC`. 

**Expected behavior (per memory):** FC-created COs should route to their **direct hiring TC** first, not the GC. The TC reviews, prices, then forwards to GC.

**Root cause:** Lines 133-142 of `PickerShell.tsx` treat FC the same as TC — both find the GC. FC should instead find its upstream TC contract.

**Fix:** For FC role, resolve the upstream TC from `project_contracts` where `to_org_id = FC's org` to find the hiring TC, and set that as `assigned_to_org_id`.

### BUG 3 — MEDIUM: No FC Participant on Test Project

The test project (`ad28bf07`) has no FC participant, so FC collaboration can't be tested on this project. This is a data issue, not a code bug — but it means the FC involvement flow is untestable on the current project.

### BUG 4 — MEDIUM: GC Labor Role Mismatch in Picker

Line 235 of `PickerShell.tsx`:
```ts
entered_by_role: detectedRole === 'GC' ? 'TC' : detectedRole,
```
When GC creates a CO with labor entries, it inserts them as `entered_by_role: 'TC'`. The `COLaborRole` type only allows `'FC' | 'TC'`, so GC can't be a labor entry author. This is technically correct (GC doesn't do labor), but the logic silently attributes GC-entered labor to TC, which could confuse financial tracking.

### BUG 5 — LOW: `canShare` Button Logic Overlap

`canShare` (line 356) shows for the creator in `draft` when `draft_shared_with_next` is false AND `canSendToWIP` is false. But for a GC who is the creator and has assigned a TC, `canSendToWIP` takes precedence (correct). If the GC hasn't assigned a TC yet, `canShare` appears — but sharing without an assigned party has unclear semantics (who receives it?).

### BUG 6 — LOW: Success Screen Says "Submitted" but CO is in Draft

After the Picker creates a CO, the success screen says "Change Order Submitted" and "Routed for approval" (line 330-334). But the CO is actually created in `draft` status. The user must still go to the detail page and explicitly submit. This is misleading UX.

---

## Proposed Fix Plan

### Step 1: Fix RLS Submit Permission (Bug 1)
Update `canSubmit` in `COStatusActions.tsx` to exclude `draft` when the user is not in the owner org:
```ts
const isOwnerOrg = co.org_id === currentOrgId;
const canSubmit = (isTC || isFC) && !isAnyCollaborator 
  && (isOwnerOrg 
    ? ['draft','shared','work_in_progress','closed_for_pricing','rejected'].includes(status)
    : ['shared','work_in_progress','closed_for_pricing','rejected'].includes(status))
  && !!co.assigned_to_org_id;
```

### Step 2: Fix FC Routing (Bug 2)
In `PickerShell.tsx`, when `detectedRole === 'FC'`, query `project_contracts` to find the upstream TC org instead of the GC.

### Step 3: Fix Success Screen Text (Bug 6)
Change "Submitted" to "Created" and "Routed for approval" to "Your draft is ready for review."

### Step 4: Clarify GC Share vs Send to WIP (Bug 5)
Hide `canShare` when there's no `assigned_to_org_id` to prevent sharing into the void.

---

## Summary Table

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | TC can't submit GC-created CO (RLS vs UI mismatch) | Needs fix |
| 2 | CRITICAL | FC CO routes to GC instead of hiring TC | Needs fix |
| 3 | MEDIUM | No FC on test project | Data gap |
| 4 | MEDIUM | GC labor entries attributed to TC | Design decision |
| 5 | LOW | Share button appears with no target | Needs fix |
| 6 | LOW | Success screen says "Submitted" but CO is draft | Needs fix |

All 4 code fixes are in frontend components — no DB migration needed.
