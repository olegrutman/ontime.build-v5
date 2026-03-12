

# Dashboard Redesign: Making It Useful at a Glance

## What's Wrong Today

Right now, your dashboard is a vertical stack of separate sections -- onboarding checklist, org invite banner, quick stats tiles, attention banner, and then the project list. The problem is:

1. **The most useful data is buried.** Financial info like "how much am I owed" and "what invoices need my attention" only appears when you manually expand a project card. If you have 5 projects, you have to click each one to understand your position.

2. **Quick Stats tiles are too simple.** They just show counts ("2 open work orders", "1 pending invoice") without dollar amounts or which projects they belong to. You can't act on them -- they just link back to the same dashboard page.

3. **No financial overview across all projects.** The `useDashboardData` hook already calculates cross-project financials (total revenue, costs, outstanding to collect, outstanding to pay, profit margin) but **none of this data is shown on the dashboard**. It's computed and thrown away.

4. **Reminders exist in the data but aren't displayed.** The hook fetches reminders, but the `RemindersTile` component is never rendered on the Dashboard page.

5. **The attention banner feels like a warning, not a tool.** It's a yellow box that says "3 items need attention" but doesn't give enough context to decide what to do first.

## What Leading Apps Do Differently

Looking at how Procore, Buildertrend, Monday.com, and modern SaaS dashboards handle this:

- **Action-first design**: The homepage answers "what do I need to do right now?" not "here's some data." Procore's landing page surfaces your to-do items front and center.
- **Financial snapshot always visible**: Total receivables, total payables, and cash position are shown at the top without clicking into anything. Think of it like checking your bank account balance.
- **Progressive disclosure**: Show summaries up top, let users drill down. Don't hide everything behind an expand button.
- **Personalized greeting with context**: "Good morning, John. You have $24,500 outstanding and 2 items need your review." One sentence that tells you everything.

## The Proposed Dashboard Layout

Here's what I'd build, top to bottom:

### 1. Welcome Header with Smart Summary
A single line that changes based on what's happening:
- "Good morning, John. You have 2 items that need your attention." (if there are action items)
- "Good morning, John. All caught up across 3 active projects." (if everything is clear)

This replaces the generic "Dashboard" title and gives immediate context.

### 2. Financial Snapshot Bar (NEW)
A compact row of 3-4 metric cards showing your cross-project financial position. The data already exists in `useDashboardData` -- it's just not rendered. For a TC user, this would show:

| To Collect | To Pay | Total Billed | Profit Margin |
|-----------|--------|-------------|--------------|
| $21,250 | $3,250 | $21,250 | 32% |

For a GC, different metrics would show (total obligations, billed by subs, etc.). This uses the `billing` and `financials` state that are already computed but never displayed.

### 3. Action Items (Redesigned Attention Banner)
Instead of a generic amber warning box, show a clean list of specific actions grouped by urgency:
- **Urgent** (red): Overdue invoices, overdue schedule items
- **Needs Review** (amber): Submitted invoices to approve, work orders pending approval
- **Informational** (blue): Pending invites, reminders due this week

Each item shows the project name, the dollar amount (if applicable), and a direct action button (Review, Approve, View). This replaces both the `DashboardQuickStats` and `DashboardAttentionBanner` components, consolidating two sections into one that's more useful.

### 4. Reminders Section
Actually render the `RemindersTile` that already exists. The component is built, the data is fetched, but Dashboard.tsx never uses it. Simple fix.

### 5. Project List (unchanged)
The expandable project cards stay as they are -- they work well for drilling into individual project details.

## Technical Changes

### Files to modify:
| File | What Changes |
|------|-------------|
| `src/pages/Dashboard.tsx` | Add welcome header, financial snapshot bar, render RemindersTile, consolidate attention sections |
| `src/components/dashboard/DashboardFinancialSnapshot.tsx` | **NEW** -- Compact financial summary using existing `billing` and `financials` data from the hook |
| `src/components/dashboard/DashboardWelcome.tsx` | **NEW** -- Smart greeting with contextual summary |
| `src/components/dashboard/DashboardQuickStats.tsx` | Remove (replaced by financial snapshot + redesigned actions) |
| `src/components/dashboard/DashboardAttentionBanner.tsx` | Redesign to show grouped, actionable items with dollar amounts and direct links |
| `src/pages/Dashboard.tsx` | Add `<RemindersTile>` with the reminders data already fetched by `useDashboardData` |

### Data flow:
- `useDashboardData` already returns `billing`, `financials`, `reminders`, `thisMonth` -- all unused today. No new queries needed.
- The `AddReminderDialog` component already exists for the reminder add button.

### What stays the same:
- The project list and expandable cards
- The onboarding checklist (only shows for new users)
- The org invite banner (only shows when there are org-level invites)
- All the data hooks and queries

## Plain English Summary

Think of your dashboard today like a filing cabinet -- everything is in there, but you have to open each drawer to find what you need. The redesign turns it into a desk with the important papers already laid out:

- **At the top**: Your money situation across all projects (how much you're owed, how much you owe)
- **Below that**: A to-do list of things that need your attention, with enough detail to know what's urgent
- **Then**: Your reminders (which are fetched but currently invisible)
- **Finally**: Your project list for drilling into specifics

The best part is that most of the data is already being fetched -- it's just not shown to you. This is mostly a UI reorganization, not a data architecture change.

