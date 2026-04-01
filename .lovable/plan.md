

# Dashboard Layout Restructure: Collapsible Sections + New Cards

## Changes

### 1. Collapse Recent Documents — show only 3, expandable
**File**: `src/components/dashboard/DashboardRecentDocs.tsx`
- Default to showing only 3 items instead of all
- Add a "Show all (N)" / "Show less" toggle button at the bottom
- Keep existing filter pills and table/mobile layouts

### 2. Collapse Recent Activity — fully collapsed by default, expandable
**File**: `src/components/dashboard/DashboardActivityFeed.tsx`
- Wrap content in a collapsible section (using Radix Collapsible)
- Default closed; header shows "Recent Activity" with chevron toggle
- When expanded, shows the existing 8-item feed

### 3. Move Budget Overview above Recent Activity
**File**: `src/pages/Dashboard.tsx`
- Reorder right column: Budget → Activity → Needs Attention → Reminders → My Team → My Partners

### 4. Add "My Team" card
**New file**: `src/components/dashboard/DashboardTeamCard.tsx`
- Fetch org members from `user_org_roles` joined with `profiles` for the current org
- Show avatars (initials), name, job title/role
- Show up to 5 members with "View all →" link to `/org/team`
- Compact card matching existing dashboard card style

### 5. Add "My Partners" card
**New file**: `src/components/dashboard/DashboardPartnersCard.tsx`
- Query `project_participants` + `project_team` to find distinct partner organizations the user works with across projects
- Show org name, type badge (GC/TC/FC), and project count
- Up to 5 entries, compact card style

### 6. Add Reminders card (already exists — just reorder)
`RemindersTile` already exists and is rendered. Will be kept in the right column layout.

### Updated right column order in Dashboard.tsx:
```
<DashboardBudgetCard />        ← moved up
<DashboardActivityFeed />      ← collapsed by default
<DashboardNeedsAttentionCard />
<RemindersTile />
<DashboardTeamCard />          ← new
<DashboardPartnersCard />      ← new
```

## Files Modified
| File | Change |
|------|--------|
| `src/components/dashboard/DashboardRecentDocs.tsx` | Show 3 items by default, add expand/collapse toggle |
| `src/components/dashboard/DashboardActivityFeed.tsx` | Wrap in Collapsible, default closed |
| `src/pages/Dashboard.tsx` | Reorder right column, add Team + Partners cards |
| `src/components/dashboard/DashboardTeamCard.tsx` | **New** — org team members card |
| `src/components/dashboard/DashboardPartnersCard.tsx` | **New** — partner organizations card |

