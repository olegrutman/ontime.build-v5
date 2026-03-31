

# Fix: Remove Duplicate Team Card on Mobile

## Problem
On mobile, **two team cards** appear:
1. `OverviewTeamCard` — inside `ProjectOverviewV2`'s right column (always renders, collapses to single column on mobile)
2. `TeamMembersCard` — rendered separately with `lg:hidden` in `ProjectHome.tsx` line 357

On desktop only `OverviewTeamCard` shows (correct). On mobile both show (bug).

## Solution
**Remove the standalone `TeamMembersCard`** from `ProjectHome.tsx` entirely. The `OverviewTeamCard` already has full interactive capabilities (material responsibility, supplier designation, system catalog) — it was upgraded in the previous change. The mobile-only `TeamMembersCard` is now redundant.

## Changes

### `src/pages/ProjectHome.tsx`
- Delete lines 357-359 (the `lg:hidden` `TeamMembersCard` block)
- Remove the `TeamMembersCard` import (line 38) since it's no longer used

### No other files changed
- `TeamMembersCard.tsx` file stays (may be used elsewhere or for future reference)
- `OverviewTeamCard.tsx` — no changes needed, already has all features

