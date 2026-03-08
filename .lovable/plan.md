

# T&M Work Order Analysis and Bug Fixes

## Findings

After analyzing the T&M implementation across both systems (work-item T&M periods and change-order T&M time cards), here are the identified bugs and gaps:

### Bug 1: Hourly rate not auto-populated from org profile
When a TC or FC adds a labor entry in T&M periods (`TMLaborEntries.tsx`), the `hourly_rate` defaults to `null`. The org profile has a `default_hourly_rate` in `org_settings`, but it is never read or applied when creating new labor entries. The same applies to the change-order `TMTimeCardsPanel` — rates must be manually set per work order instead of defaulting from the org's profile.

### Bug 2: TC without FC cannot enter their own hours in work-item T&M
In `TMLaborEntries.tsx`, only TC and FS can add entries (line 29). However, when a TC has no FC on the project, they should be able to log their own labor hours directly. Currently this works because TC is allowed, but the **rate column is only editable by TC** (`!isTC || !isEditable` on line 179) — which is correct. The real gap is that there's no UI indication or workflow for "TC self-performing" vs "FC performing" labor, and the TC cannot see a summary distinguishing their own cost from what they bill to GC.

### Bug 3: FC activation/deactivation missing from work-item T&M
The `ParticipantActivationPanel` (FC activate/deactivate by TC) only exists in `change-order-detail/`. The work-item `WorkItemParticipants.tsx` uses a generic org-code invite system with no role-based activation logic. There is no way for TC to activate or deactivate an FC specifically on a T&M work item — they can only add generic participants by org code.

### Bug 4: No FC role support in work-item T&M period actions
In `TMPeriodActions.tsx`, only TC can approve/reject periods (lines 37-38). If TC doesn't have an FC, the TC submits and also approves their own periods, which is a self-approval issue. There should be a streamlined flow when no FC exists.

### Bug 5: Material entries missing `entered_by` tracking
In `TMMaterialEntries.tsx` line 47-56, the insert doesn't include `entered_by`, unlike labor entries. This means there's no audit trail for who logged material costs.

---

## Plan

### 1. Auto-populate hourly rates from org profile settings

**Files:** `TMLaborEntries.tsx`, `TMTimeCardsPanel.tsx`

- When adding a new labor entry in `TMLaborEntries.tsx`, fetch the current user's org's `default_hourly_rate` from `org_settings` and pre-fill it on the new entry
- In `TMTimeCardsPanel.tsx`, when `tc_hourly_rate` or `fc_hourly_rate` is null/0 on the change order, auto-fetch from the respective org's `org_settings.default_hourly_rate` and pre-populate the rate editor

### 2. Add FC activation/deactivation to work-item T&M

**Files:** `WorkItemPage.tsx`, new `WorkItemFCActivation.tsx`

- Create a new component similar to `ParticipantActivationPanel` but scoped to work items
- Allow TC to activate an FC from their trusted partners or by org code
- Allow TC to deactivate an FC (only when no submitted periods exist)
- Show active FC with a toggle/remove button
- When no FC is active, show a clear "Self-Performing" indicator and adjust the UI accordingly

### 3. Handle TC self-performing (no FC) in T&M periods

**Files:** `TMLaborEntries.tsx`, `TMPeriodCard.tsx`, `TMPeriodActions.tsx`

- When no FC participant exists on the work item, show a "Self-Performing" badge on the period card
- Skip the submit-then-approve flow — TC entries go directly to a "ready to bill" state
- Labor entries entered by TC without FC should be clearly labeled as "TC Labor"

### 4. Fix material entry audit trail

**Files:** `TMMaterialEntries.tsx`

- Add `entered_by: user.id` to the material entry insert (requires fetching user from `useAuth`)

---

## Files to Edit
- `src/components/work-item/tm/TMLaborEntries.tsx` — auto-populate rate, self-performing label
- `src/components/work-item/tm/TMMaterialEntries.tsx` — add entered_by tracking
- `src/components/work-item/tm/TMPeriodCard.tsx` — self-performing indicator
- `src/components/work-item/tm/TMPeriodActions.tsx` — streamlined TC self-approval flow
- `src/components/work-item/WorkItemPage.tsx` — add FC activation panel
- `src/components/change-order-detail/TMTimeCardsPanel.tsx` — auto-populate rates from org settings
- New: `src/components/work-item/tm/WorkItemFCActivation.tsx` — FC activate/deactivate for work items

