

# Add Team Members to Partner Directory

## Overview

Enhance the Partner Directory page to show individual people (team members) from all shared projects, in addition to the existing organization-level view. Users will be able to toggle between an "Organizations" view (current) and a "People" view (new).

## Data Source

The `project_team` table already contains all the necessary data for each team member:
- `invited_name` -- person's name
- `invited_email` -- person's email
- `invited_org_name` -- their organization name
- `role` -- their project role (General Contractor, Trade Contractor, etc.)
- `org_id` -- links to organizations table for org details
- `user_id` -- set when the invite is accepted
- `status` -- active, invited, etc.

RLS policies already grant visibility to team members on shared projects, so no database changes are needed.

## UI Design

Add a tab bar at the top of the Partner Directory to switch between two views:

```text
[Organizations]  [People]
```

**Organizations tab** -- Keeps the current view exactly as-is (grouped by org type).

**People tab** -- Shows a deduplicated list of individual team members:
- Each person card shows: Name, Email, Role badge, Organization name, number of shared projects, most recent project name
- People are grouped by their project role (General Contractors, Trade Contractors, Field Crews, Suppliers) -- same grouping as orgs
- Sorted by recency of collaboration
- Avatar circle with initials fallback
- The search bar filters across both tabs (name, email, org name, project name)

## Deduplication Logic

People may appear on multiple projects. The deduplication strategy:
1. If `user_id` is set (accepted invite), deduplicate by `user_id`
2. If `user_id` is null (pending invite), deduplicate by `invited_email`
3. Track project count and most recent project per person

## Technical Details

### Changes to `src/pages/PartnerDirectory.tsx`

**New interface:**
```text
interface PartnerPerson {
  key: string;           // user_id or invited_email
  user_id: string | null;
  name: string;
  email: string;
  org_name: string;
  org_type: string;
  role: string;
  project_count: number;
  most_recent_project: string | null;
  most_recent_date: string | null;
}
```

**New state:**
- `activeTab` state: `'organizations' | 'people'` (default: `'organizations'`)
- `people` state: `PartnerPerson[]`

**Data fetching:**
- Extend the existing `fetchPartners` function to also build the people list from the same `project_team` query
- The current query already fetches `project_team` rows for all shared projects with org and project details
- Add a second pass over the same `teamMembers` data to build the people map, deduplicating by `user_id` or `invited_email`
- Also fetch the `invited_name`, `invited_email`, `role` fields from `project_team` (these are already in the table but not currently selected)

**Updated query select:**
```text
project_team: org_id, project_id, user_id, invited_name, invited_email, invited_org_name, role,
  projects!inner(id, name, updated_at),
  organizations!inner(id, org_code, name, type)
```

**Rendering:**
- Add `Tabs` component (from existing UI library) above the content area
- Organizations tab renders the current grouped card layout (unchanged)
- People tab renders a similar grouped layout but with person cards showing avatar initials, name, email, org badge, and project stats
- Search filters apply to whichever tab is active

### Components Used (all existing, no new dependencies)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- `Avatar`, `AvatarFallback` from `@/components/ui/avatar`
- `RoleBadge` from `@/components/ui/role-badge` (for org type badges)
- Existing `Card`, `Badge`, `Input`, `Skeleton` components

### No Database Changes Required
- No new tables or migrations
- No RLS policy changes (project_team RLS already grants access to shared project members)
- No new edge functions

### File Changes

| File | Change |
|---|---|
| `src/pages/PartnerDirectory.tsx` | Add Tabs (Organizations/People), new people data fetching and rendering, extend search to cover people fields |

