

# Dashboard Redesign for All User Types

## Current State Assessment

The dashboard currently has a rigid 3-column tile grid (Financial Snapshot, Needs Attention, Reminders) followed by a status-filtered project list. All four user types (GC, TC, FC, Supplier) see the same layout with minor role-based data differences inside tiles. The problems:

1. **Desktop feels sparse and clunky** -- three small tiles stretched across a wide screen with lots of dead space, followed by a long vertical project list
2. **Tiles are equally weighted** but they shouldn't be -- "Needs Attention" is far more actionable than a static financial snapshot
3. **Project rows are card-based** with small text, hover-only actions, and redundant status badges already visible in the filter bar
4. **No "at a glance" numbers** -- you have to mentally add up pending items across tiles
5. **Mobile stacks everything vertically** creating excessive scrolling, with small tap targets (h-7 buttons in PendingInvitesPanel)
6. **No role-aware prioritization** -- a Field Crew member doesn't need the same dashboard as a GC

## Design Strategy

Apply the same "Glanceable First, Expandable Second" principle from the Project Overview redesign. The dashboard should answer one question in 3 seconds: **"What do I need to do right now?"**

### Layout: Two-Zone Desktop, Single-Column Mobile

```text
DESKTOP (2 columns, 65/35 split):
+----------------------------------+-------------------+
| ZONE A: Action Center            | ZONE B: Summary   |
|                                  |                   |
| [Attention Banner (if items)]    | [Financial Card]  |
| [Pending Invites (inline)]       | [Reminders Card]  |
| [Status Tabs + Project List]     |                   |
|                                  |                   |
+----------------------------------+-------------------+

MOBILE (1 column, reordered):
[Attention Banner]
[Pending Invites]
[Financial Summary (collapsed)]
[Status Tabs]
[Project List]
[Reminders (collapsed)]
```

### Key Changes

**1. Move Status Tabs into the main content area (not sticky)**

The current sticky `StatusMenu` bar wastes vertical space and is redundant once you're scrolled past projects. Instead, integrate status filtering as inline tabs above the project list within Zone A.

**2. Replace the 3-tile grid with a compact Attention Banner**

Merge "Needs Attention" + "Pending Invites" into a single prominent banner at the top of Zone A. Same amber style as the Project Overview `AttentionBanner` -- consistent experience across pages. Shows counts and action links inline. If nothing needs attention, it disappears entirely (no "All caught up" taking space).

**3. Financial Card moves to Zone B sidebar**

Becomes a compact single card in the right column. Same data, less sprawl. On mobile it collapses into a single headline number with an expand toggle.

**4. Reminders move to Zone B sidebar**

Below the financial card. Keeps the same functionality but in a more compact, sidebar-appropriate format.

**5. Project List gets bigger touch targets and clearer info density**

- Project name: 16px font (was 14px)
- Role and contract value shown inline on mobile too
- Status badges: 12px minimum text
- Remove hover-only actions; use direct tap on the entire row
- Dropdown menu button: 44px touch target (was 32px)
- "Last updated" text: 13px (was 12px)
- Pending actions badge: larger, more prominent

**6. Role-Aware Empty States**

Different empty states per role:
- GC/TC: "Create your first project" CTA
- FC: "You'll see projects here once a contractor invites you"
- Supplier: "Projects will appear once you're added to a contractor's team"

## Technical Plan

### Files to Create

**`src/components/dashboard/DashboardAttentionBanner.tsx`**
A dashboard-level attention banner combining the current `NeedsAttentionTile` and `PendingInvitesPanel` into one unified component. Shows:
- Work Orders needing approval (GC only)
- Invoices to review
- Pending invitations (with inline Accept/Decline)
- Sent invites awaiting response
Each with icon, count, and tappable action link. Uses the same amber styling as `AttentionBanner` from project overview for visual consistency.

**`src/components/dashboard/DashboardFinancialCard.tsx`**
A sidebar-format financial card replacing `FinancialSnapshotTile`. Shows:
- GC: Total Contract Value + Outstanding to Pay
- TC: Revenue, Costs, Profit Margin
- FC: Contract Value + Outstanding to Collect
- Supplier: (hidden -- suppliers don't have cross-project financials)
Compact single-card format with a headline number and 2-3 sub-metrics.

**`src/components/dashboard/DashboardProjectList.tsx`**
Extracted project list with integrated status tabs. Takes the current `StatusMenu` and `ProjectRow` list and wraps them in a single component with:
- Inline tab bar (not sticky)
- Enhanced `ProjectRow` with bigger fonts and touch targets
- Role-aware empty states

### Files to Modify

**`src/pages/Dashboard.tsx`**
- Replace the 3-column tile grid with the two-zone layout
- Use `lg:grid-cols-[1fr_360px]` grid (matching Project Overview)
- Zone A: DashboardAttentionBanner + DashboardProjectList
- Zone B: DashboardFinancialCard + RemindersTile
- Remove the separate `StatusMenu` sticky bar
- Remove the separate `PendingInvitesPanel` section

**`src/components/dashboard/ProjectRow.tsx`**
- Increase font sizes: project name `text-base` (16px), meta info `text-sm` (14px)
- Increase dropdown menu button to `h-10 w-10` (44px touch target)
- Show contract value on mobile row too
- Increase badge text to `text-sm` (was `text-xs`)
- Make status badge + pending count more prominent
- Remove HoverActions (requires precise hover, bad for touch)
- Add subtle left border colored by project status (green=active, amber=hold, etc.)

**`src/components/dashboard/RemindersTile.tsx`**
- Increase font sizes: reminder title `text-sm` to `text-base`, due date `text-xs` to `text-sm`
- Increase checkbox touch target to 44px
- Increase "Add" button from `h-8 w-8` to `h-10 w-10`
- Overdue reminders: bolder red styling

**`src/components/dashboard/StatusMenu.tsx`**
- Increase button sizes: `py-2.5 px-5` with `text-base` font
- Status dot: `w-2.5 h-2.5` (was `w-2 h-2`)
- Count badge: `text-sm` (was `text-xs`)
- Component will be used inline (not sticky) within DashboardProjectList

**`src/components/dashboard/PendingInvitesPanel.tsx`**
- Increase Accept/Decline buttons from `h-7 text-xs` to `h-10 text-sm`
- Increase project name font to `text-base`
- Increase description font to `text-sm`
- Will be embedded inline within DashboardAttentionBanner instead of standalone

**`src/components/dashboard/index.ts`**
- Export new components: DashboardAttentionBanner, DashboardFinancialCard, DashboardProjectList
- Keep existing exports for backward compatibility

### Files to Keep Unchanged

- `src/hooks/useDashboardData.ts` -- data layer is fine, no changes needed
- `src/components/dashboard/AddReminderDialog.tsx` -- dialog works well
- `src/components/dashboard/ArchiveProjectDialog.tsx` -- dialog works well
- `src/components/dashboard/CompleteProjectDialog.tsx` -- dialog works well
- `src/components/layout/AppLayout.tsx` -- layout shell unchanged
- `src/components/layout/TopBar.tsx` -- top bar unchanged

### Sizing Rules (Applied Across All Dashboard Components)

| Element | Current | New |
|---------|---------|-----|
| Body text / labels | 12px (`text-xs`) | 14px (`text-sm`) |
| Project name | 14px (default) | 16px (`text-base`) |
| Key numbers | 14px | 24px+ (`text-2xl`) |
| Badges | 12px (`text-xs`) | 14px (`text-sm`) |
| Tap targets (buttons) | 28-32px (`h-7`, `h-8`) | 40-44px (`h-10`, `h-11`) |
| Icon sizes | 16px (`h-4 w-4`) | 20px (`h-5 w-5`) |
| Muted helper text | 10-12px | 13-14px (`text-[13px]` or `text-sm`) |

### Implementation Order

1. Create `DashboardAttentionBanner` (combines attention items + invites)
2. Create `DashboardFinancialCard` (compact sidebar format)
3. Create `DashboardProjectList` (status tabs + project list integrated)
4. Update `ProjectRow` (bigger fonts, touch targets, status border)
5. Update `RemindersTile` (bigger fonts, touch targets)
6. Update `Dashboard.tsx` (new two-zone layout, wire everything together)
7. Update `index.ts` (exports)

### What Stays the Same

- All existing data and functionality preserved
- Same status filtering (Active/On Hold/Completed/Archived)
- Same project actions (Archive, Complete, Status Change)
- Same reminder functionality (add, complete, due dates)
- Same financial data per role
- Same invitation accept/decline flow
- Dark sidebar navigation
- All dialogs (Archive, Complete, Add Reminder)
- The `useDashboardData` hook -- no data layer changes

