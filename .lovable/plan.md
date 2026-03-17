
# Fix FC Labor Entry Save & Equipment Visibility

## Problem 1: FC can't save hours/lump sum
**Root cause**: RLS policy on `co_labor_entries` requires `org_id` to match the user's org. But `CODetailPage` passes `orgId={co.org_id}` (the TC's org) to `COLineItemRow`, which passes it to `LaborEntryForm`. The FC user's org is different from the CO's org, so the insert is rejected.

**Fix**: In `CODetailPage.tsx`, instead of always passing `co.org_id`, derive the current user's org from `userOrgRoles[0].organization_id` and pass that as `orgId` to `COLineItemRow`.

### Changes in `CODetailPage.tsx`:
- Import `userOrgRoles` from `useAuth()`
- Compute `const myOrgId = userOrgRoles[0]?.organization_id ?? co.org_id`
- Pass `orgId={myOrgId}` to `COLineItemRow` instead of `co.org_id`

## Problem 2: FC sees equipment pricing
**Root cause**: `COEquipmentPanel` receives `isTC` and `isGC` but NOT `isFC`. The cost display at line 188 uses `!isGC` which includes FC. The billed amount at line 198-200 is shown to everyone unconditionally.

**Fix**: 
1. Add `isFC` prop to `COEquipmentPanel`
2. Hide cost/markup from FC (line 188: change `!isGC` to `isTC`)
3. Hide billed amount from FC — FC should only see equipment description, no pricing
4. In the footer totals (lines 307-322), hide cost/markup/total from FC
5. Pass `isFC` from `CODetailPage.tsx`

### Changes in `COEquipmentPanel.tsx`:
- Add `isFC: boolean` to interface
- Line 188: `{!isGC && (` → `{isTC && (`
- Line 198-200: wrap billed amount display in `{!isFC && ...}`
- Lines 307-322 footer: wrap in `{!isFC && ...}`

### Changes in `CODetailPage.tsx`:
- Add `isFC={isFC}` prop to `<COEquipmentPanel>`
