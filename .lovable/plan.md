

# Allow SOV Regeneration When Contract Value Changes

## Problem
When the SOV is locked and the contract value changes, the mismatch banner says "Create a new version to update" but provides no button. The edge function already handles versioning (creates a new SOV version), so we just need to expose the button.

## Fix

**File: `src/pages/ProjectSOVPage.tsx`**

1. In the contract mismatch banner (line 179), change the condition from `canEdit && !isLocked` to `isCreator` — the creator should always be able to regenerate when there's a mismatch, because regenerating creates a **new version** (it doesn't modify the locked one).

2. Update the button label: show "Create New Version" when the current SOV is locked, "Regenerate" when unlocked.

That's it — one condition change, one label tweak. The edge function and hook already handle everything else correctly.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Change regenerate button condition from `canEdit && !isLocked` to `isCreator`, update button label for locked state |

