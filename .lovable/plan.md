

# Show Material Responsibility in Team Card

## Problem
The team card currently shows "Materials: TC" or "Materials: GC" as a generic label. It should show the **actual organization name** responsible for materials (e.g., "Materials: Acme Contractors").

## Change

**File: `src/components/project/OverviewTeamCard.tsx`**

Update the material responsibility section (lines 84-90) to:
1. Find the team member whose role matches the responsible party (TC or GC)
2. Display their org name instead of just "TC"/"GC"
3. Make the indicator more prominent — use a colored badge style with the Package icon, matching the role dot color of the responsible org

```text
Before:  📦 Materials: TC
After:   📦 Materials: Acme Contractors (TC)  ← with role-colored accent
```

The `members` array already has `role` and `org_name` — just match the responsible role to find the org name. If neither flag is set, hide the section entirely (already handled).

## Files Modified
- `src/components/project/OverviewTeamCard.tsx` — update material label to show org name

