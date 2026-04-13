

# Fix: Material Responsibility Not Shown on TC Project Team Card

## Problem
The TC Project Overview page renders its own inline team card (inside `TCProjectOverview.tsx`, Card 9 at line 723) which lists team members but **never fetches or displays material responsibility**. The `ProjectOverviewTeamCard` component (which does show material responsibility) is imported in `ProjectHome.tsx` but never used — the TC path goes directly to `TCProjectOverview` which has its own team rendering.

The database confirms `material_responsibility = 'GC'` is correctly stored in `project_contracts` for this project. The issue is purely a UI display gap.

## Fix

### File: `src/components/project/TCProjectOverview.tsx`

**1. Fetch material responsibility** (alongside the existing `fetchTeam` call):
- Query `project_contracts` for `material_responsibility` where it's not null, same pattern used by `ProjectOverviewTeamCard` (line 58 of that file).
- Store in a `materialResp` state variable.

**2. Display material responsibility in the Team card** (after the team member list, before the "Invite FC" button, around line 759):
- Add a row showing: `📦 Materials: General Contractor` or `Trade Contractor` (matching the pattern in `ProjectOverviewTeamCard` lines 139-143).
- Use the existing `C.muted` / `C.border` color tokens for consistency.

### No other files need changes
- The DB already stores the correct value.
- RLS policies on `project_contracts` already allow project participants to read.
- The `useCOResponsibility` hook correctly reads from `project_contracts` for CO-level decisions.

