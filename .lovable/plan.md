

# CO Flow Bug Report & Fix Plan

## Bugs Found

### Bug 1: StepCatalog clears wizard-level location/reason when used as Scope step
**Severity: High**
When `StepCatalog` is used inside the wizard's "Scope" step, it shows "✕" buttons on the location and reason pills (lines 177, 185 of StepCatalog.tsx). Clicking these calls `onChange({ locationTag: '' })` or `onChange({ reason: ... })` and sets `phase` back to 'location' or 'reason' — effectively **clearing the wizard-level data** set in Steps 1 and 2. The user then sees a duplicate location/reason picker inside the Scope step, which is confusing and breaks the wizard flow.

**Fix**: When `StepCatalog` detects it's being used inside the wizard (i.e., `data.locationTag` and `data.reason` were pre-set on mount), hide the "✕" dismiss buttons on the location/reason summary pills. Make them read-only indicators instead.

### Bug 2: GC creates TC collaborator with wrong type `'FC'`
**Severity: Medium**
In `COWizard.tsx` line 229, when a GC assigns a TC, it creates a collaborator row with `collaborator_type: 'FC'`. Comment says "using FC type since that's the only enum" — but this is semantically wrong and may confuse downstream logic that filters by `collaborator_type === 'FC'`.

**Fix**: The DB enum only has `'FC'`, so this is a schema gap. Add a comment clarifying this is intentional for now, or better: skip creating a collaborator for the assigned TC since `assigned_to_org_id` already tracks that relationship.

### Bug 3: `forwardRef` warnings for `COLineItemRow` and `COSidebar`
**Severity: Low (cosmetic)**
Console shows "Function components cannot be given refs" for these components. This comes from Radix UI or a parent passing refs down. Neither component uses `forwardRef`.

**Fix**: Wrap both components with `React.forwardRef` or identify the parent passing the ref and remove it.

### Bug 4: FC collaborator with `'rejected'` status loses access after `canSubmit` check
**Severity: Medium**
In `COStatusActions.tsx` line 354, `canSubmit` requires `!isCollaborator`. But `isCollaborator` on line 346 checks for `status === 'active'`. If an FC collaborator has `rejected` status, they're not `isCollaborator` and could potentially see submit buttons they shouldn't. The logic is fragile.

**Fix**: Clarify the collaborator check — FC users who are collaborators (any status) should not see the primary submit button, only the FC-specific `canSubmitFCPricing` path.

### Bug 5: TC `tc_submitted_price` snapshot uses `laborTotal` instead of `grandTotal`
**Severity: Medium**
In `COStatusActions.tsx` line 222, when `use_fc_pricing_base` is OFF, the TC's submitted price is set to `financials?.laborTotal ?? 0`. But `laborTotal` doesn't include materials and equipment. The GC sees this as the total price, which would be incorrect if materials/equipment are present.

**Fix**: Use `financials?.grandTotal` or at minimum `financials?.tcBillableToGC` to include the full billable amount.

### Bug 6: Wizard doesn't validate scope items on the Team (final) step
**Severity: Low**
`canAdvance()` for the `team` step always returns `true`. If somehow `selectedItems` got cleared (e.g., via Bug 1), the user could submit an empty CO.

**Fix**: Add `data.selectedItems.length > 0` check to the team step as well.

## Files to Change

| File | Changes |
|------|---------|
| `src/components/change-orders/wizard/StepCatalog.tsx` | Hide location/reason dismiss buttons when pre-set by wizard |
| `src/components/change-orders/wizard/COWizard.tsx` | Remove GC→TC collaborator insert (Bug 2); add final-step scope validation (Bug 6) |
| `src/components/change-orders/COStatusActions.tsx` | Fix `tc_submitted_price` to use `grandTotal` (Bug 5) |
| `src/components/change-orders/COLineItemRow.tsx` | Wrap with `forwardRef` (Bug 3) |
| `src/components/change-orders/COSidebar.tsx` | Wrap with `forwardRef` (Bug 3) |

