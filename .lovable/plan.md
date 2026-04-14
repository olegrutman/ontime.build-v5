

# Allow Platform Owner to Edit SOV Item Names on Locked SOVs

## Problem
Once an SOV is locked, `canEdit` becomes `false` (line 52: `isContractClient && !isLocked`), which blocks ALL editing — including item names. Platform owners need to rename items even after locking, without touching percentages or values.

## Approach
Introduce a `canEditName` flag that is `true` when `canEdit` is true OR when the viewer is a platform user. Use `canEditName` only for the item name column; all other columns (%, amount, lock toggle, delete, add) stay gated behind `canEdit`.

### 1. Update `src/pages/ProjectSOVPage.tsx` — `SOVContractSection`
- Import `useAuth` and destructure `isPlatformUser`
- Add: `const canEditName = canEdit || isPlatformUser;`
- **Line 300**: Change `canEdit && editingNameId === item.id` → `canEditName && editingNameId === item.id`
- **Line 312**: Change `cn(canEdit && "cursor-pointer hover:text-primary")` → `cn(canEditName && "cursor-pointer hover:text-primary")`
- **Line 314**: Change `if (canEdit)` → `if (canEditName)`
- Leave all other `canEdit` references (%, amount, lock, delete, add line) unchanged

### 2. Update `src/hooks/useSOVPage.ts` — `updateLineName`
- The function already does NOT check `is_locked` (line 342 only checks `!currentSOV` and `!newName.trim()`), so no backend change is needed

### Files to edit
- `src/pages/ProjectSOVPage.tsx` (4 line changes + 1 import addition)

No database or RLS changes required — the update goes through `project_sov_items` which platform users can already write to.

