

# Bug Report: Unified Work Order Wizard

After analyzing all wizard files, hooks, and integration code, here are the bugs found:

---

## Critical Bugs

### 1. Missing `DialogDescription` — Console Warning
**File:** `UnifiedWOWizard.tsx` (line 158)
The `DialogContent` has no `DialogDescription`, causing the console warning: `Missing Description or aria-describedby`.
**Fix:** Add `<DialogDescription className="sr-only">...</DialogDescription>` inside DialogContent.

### 2. `useMemo` Used as Side Effect (Lines 59-66)
**File:** `UnifiedWOWizard.tsx`
`useMemo` is called with `setFormData` inside it — this is a React anti-pattern. `useMemo` should not have side effects. This can cause unpredictable behavior on re-renders.
**Fix:** Replace with `useEffect` (or better, set defaults in the initial state factory).

### 3. Wizard Has No `onComplete` Handler — Submit Does Nothing
**File:** `WorkOrdersTab.tsx` (line 494-499)
The `UnifiedWOWizard` is rendered without an `onComplete` prop. When the user clicks "Submit Work Order", `handleSubmit` calls `onComplete` which is undefined, so **nothing is saved to the database**. The wizard closes and all data is lost.
**Fix:** Pass an `onComplete` handler that calls `useWorkOrderDraft.saveDraft()` and `convertToWorkOrder()`.

### 4. Old Wizards Still Rendered
**File:** `WorkOrdersTab.tsx` (lines 438-491)
Both `WorkOrderWizard` and `FCWorkOrderDialog` are still rendered and functional. The "Create your first work order" empty-state button (line 422) still opens the **old** wizard (`setShowWizard(true)`), not the unified one. The field capture conversion flow (line 104-111) also still routes to old wizards.
**Fix:** Either remove old wizards or route all create flows through `showUnifiedWizard`.

### 5. FC Role Check is Incomplete
**File:** `UnifiedWOWizard.tsx` (line 53)
`isFC = currentRole === 'FC_PM' || currentRole === 'FS'` — but the `FS` role (Field Supervisor) is treated as FC. Meanwhile `useWorkOrderDraft.ts` (line 98) determines `addedByRole` from `organization.type`, not from `currentRole`. These two approaches could diverge if an FS user belongs to a TC org.
**Fix:** Use consistent role detection — prefer org type over currentRole for FC/TC determination.

---

## Medium Bugs

### 6. `ScopeStep` Ref Warning
**File:** Console log shows `Function components cannot be given refs` for `ScopeStep`. The Dialog system is trying to pass a ref to a function component.
**Fix:** Wrap `ScopeStep` with `React.forwardRef` or ensure the parent doesn't pass a ref.

### 7. Financial Summary Shows Wrong Markup % Label
**File:** `FinancialSummaryStrip.tsx` (lines 52, 59)
The markup label shows `data.materials_markup_pct` (the default), not the actual per-row markup. If a user overrides markup on individual rows, the label is misleading.
**Fix:** Calculate effective average markup from rows, or remove the % from the label.

### 8. `useProjectLaborRates` Matches Wrong Row
**File:** `useProjectLaborRates.ts` (line 22)
Uses `.maybeSingle()` which returns null if multiple rows match. A project can have multiple `project_team` entries for the same org (different users). This should filter by user or use a more specific query.
**Fix:** Add `.eq('user_id', user.id)` or use `.limit(1)` with an order.

### 9. Location Step Always Shows Elevations When No Items Selected
**File:** `LocationStep.tsx` (line 57)
`if (hasExteriorItems || data.selectedCatalogItems.length === 0)` — Elevations show when zero items are selected (which is always true at first). Per spec, elevations should only show for exterior/roofing/waterproofing divisions.
**Fix:** Only show elevations when `hasExteriorItems` is true.

### 10. Quick Capture Auto-Save Banner is Cosmetic Only
**File:** `LocationStep.tsx` (lines 110-118)
The green "Draft saved" banner appears but no actual save happens. The auto-save trigger described in the spec (upsert to `change_order_projects`) is not implemented.
**Fix:** Call `saveDraft()` when conditions are met. This requires passing the draft hook into the LocationStep or lifting the auto-save logic to the wizard shell.

---

## Minor Bugs

### 11. Labor Validation Allows Zero Hours
**File:** `UnifiedWOWizard.tsx` (line 81)
`canGoNext` for labor in hourly mode only checks `hourly_rate > 0`, not hours. A user can proceed with rate set but 0 hours, resulting in $0 labor total.

### 12. No Supplier Field in Materials UI
**File:** `MaterialsStep.tsx`
The `WOMaterialRowDraft` type has a `supplier` field but the UI has no input for it. Per spec, FC should see columns A-D which includes supplier context.

### 13. Review Step "Edit" Jumps Don't Work for All Steps
**File:** `ReviewStep.tsx` — `onJumpToStep('scope')` calls `jumpToStepByKey` which uses `setCurrentStepIndex`. But it only allows jumping to steps with index < currentStepIndex (line 103 of wizard). Since Review is the last step, all jumps work. However, after jumping back and then forward, the user must click through each step again — there's no "jump forward" to return to Review.

---

## Summary of Required Fixes

| # | Severity | Fix |
|---|----------|-----|
| 1 | Critical | Add DialogDescription for accessibility |
| 2 | Critical | Replace useMemo side effect with useEffect |
| 3 | Critical | Wire onComplete to actually save data |
| 4 | Critical | Remove or unify old wizard entry points |
| 5 | Medium | Consistent FC/TC role detection |
| 6 | Low | forwardRef on ScopeStep |
| 7 | Low | Fix markup % label accuracy |
| 8 | Medium | Fix labor rate query ambiguity |
| 9 | Medium | Fix elevation chips visibility logic |
| 10 | Medium | Implement actual auto-save for Quick Capture |
| 11 | Low | Validate hours > 0 for hourly mode |
| 12 | Low | Add supplier field to Materials UI |
| 13 | Low | Allow forward navigation after edit jumps |

