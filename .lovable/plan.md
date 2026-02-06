

# Project Overview Redesign -- Desktop & Mobile Optimization

## What's Wrong Today

After reviewing every component on the Project Overview page, here are the specific problems:

**Desktop (1920px):**
- The 3-column "Project Details" grid (Team, Contracts, Scope) shows collapsed cards that waste most of the screen width -- on a wide monitor, each card is narrow yet tall when expanded, creating an awkward layout
- The "Needs Attention" section uses the same rigid 3-column grid for summary cards that could be more compact
- The Financial Snapshot at the bottom is a dense 4-column grid of cards that sprawls horizontally -- on wide screens, the cards are too spread out; on medium screens, they stack awkwardly
- Section headers ("PROJECT DETAILS", "NEEDS ATTENTION", "FINANCIAL SNAPSHOT") use small-caps muted text that is hard to scan quickly
- There's too much vertical scrolling -- a user on a jobsite has to scroll past collapsed accordion cards to reach actionable information

**Mobile (390px):**
- The tab bar ("Overview | SOV | Work Orders | Invoices | POs | Documents") horizontally overflows and is hard to tap
- All 3-column grids stack vertically, creating a very long scroll
- Summary cards (Work Orders, Invoices, POs) are full-width but show a lot of whitespace inside
- Financial cards with inline editing are cramped

**Consistency Issues:**
- The Project Wizard uses clear step headings with helper text and generous spacing, while the overview page uses dense collapsed accordion cards
- Wizard buttons are large touch targets (44px+), while overview action buttons are tiny (h-6, h-7)
- Font sizes are inconsistent: 10px badges, 12px labels, small icons

## Design References

The redesign draws inspiration from these construction and project management tools that solve similar problems well:

1. **Procore** (procore.com) -- The industry standard for construction PM. Their project overview uses a "dashboard tile" approach where the most critical numbers are always visible above the fold, with drill-down tabs for details. They use large, clear status indicators and action-oriented sections.

2. **Monday.com** (monday.com) -- Already referenced in our design system. Their project summaries use horizontal "status bars" and compact metric widgets that show key numbers without expanding. Information density is high but readable.

3. **Fieldwire** (fieldwire.com) -- Designed specifically for field workers on mobile. They use a bottom-sheet navigation pattern, large touch targets, and prioritize "what needs my attention right now" as the first thing you see.

4. **Buildertrend** (buildertrend.com) -- Uses a "command center" layout where the project overview is a single-scroll page with horizontally scrollable metric cards at the top, followed by a prioritized activity feed.

## Redesign Strategy

### Core Principle: "Glanceable First, Expandable Second"

A construction worker pulls out their phone between tasks. They need to answer in 3 seconds: "Is there anything I need to act on right now?" Everything else is secondary.

### Layout Changes

**1. Sticky Top Bar -- Keep As-Is (works well)**
The project name, status badge, and tab navigation are good. One improvement: make tabs scrollable horizontally on mobile with a subtle fade indicator.

**2. Replace Three-Section Layout with Two-Zone Layout**

```text
DESKTOP (2 columns):
+----------------------------------+-------------------+
|  ZONE A: Action & Summary        |  ZONE B: Context  |
|                                   |                   |
|  [Needs Attention Banner]         |  [Team Card]      |
|  [Metric Strip: WOs | INVs | POs]|  [Contracts Card] |
|  [Financial Summary Card]         |  [Scope Card]     |
|                                   |                   |
+----------------------------------+-------------------+

MOBILE (1 column, reordered):
[Needs Attention Banner]
[Metric Strip (horizontal scroll)]
[Financial Summary Card]
[Team / Contracts / Scope accordions]
```

**Zone A (Left, ~65% width on desktop)** = Actionable information. What needs attention, key numbers, financial health. This is what you see first.

**Zone B (Right, ~35% width on desktop)** = Reference/context information. Team members, contract details, scope details. These are collapsible and secondary.

**3. Metric Strip -- New Component**

Replace the three separate summary cards (Work Orders, Invoices, POs) with a single horizontal "Metric Strip" component. Each metric is a compact cell showing:
- Icon + Label (e.g., "Work Orders")
- Big number (e.g., "12")
- Status breakdown as colored dots or a mini bar (e.g., 3 green, 2 amber, 7 gray)
- Tappable to navigate to that tab

This is inspired by Procore's project dashboard and Monday.com's summary widgets. On mobile, the strip scrolls horizontally.

**4. Financial Summary -- Consolidated Card**

Replace the sprawling 4-column financial grid with a single, well-organized card that shows:
- A prominent "headline number" (Revenue for TC, Contract Value for GC)
- Key sub-metrics in a 2x2 mini-grid (Billed, Outstanding, Retainage, Profit)
- The billing progress bar at the bottom
- An "Expand" button that reveals the full breakdown (currently hidden content)

This reduces the Financial Snapshot from 4-6 separate cards to 1 card with progressive disclosure.

**5. Needs Attention -- Prominent Banner**

Move the alert banner for pending work orders to the very top of the content area (it already is). Enhance it to show ALL attention items, not just pending work orders. Include counts for:
- Work Orders needing approval
- Invoices awaiting action
- POs awaiting pricing
Each with a direct-action link.

**6. Context Cards (Team, Contracts, Scope) -- Right Column**

Keep the existing collapsible card pattern but:
- Increase font sizes (14px minimum for labels, 16px for values)
- Use 44px touch targets for all interactive elements
- Show 2-3 key facts when collapsed (not just counts)
- Add clearer visual hierarchy with role-colored left borders

### Font & Sizing Rules

- All body text: minimum 14px (was 12px in places)
- All labels: minimum 13px (was 10px in places)
- All tap targets: minimum 44px height
- Badge text: minimum 12px (was 10px)
- Key numbers/metrics: 24px+ for primary, 16px for secondary
- Muted helper text: 13px (was 10-12px)

### Mobile-Specific Improvements

- Tab bar: horizontally scrollable with fade edges, larger tap targets (36px height minimum)
- Metric strip: horizontally scrollable cards with snap points
- Bottom padding: 80px to account for phone navigation bars
- All section dividers: 16px spacing (was 8px in places)

## Technical Plan -- Files to Change

### 1. New Component: `src/components/project/MetricStrip.tsx`

A horizontal strip showing summary metrics for Work Orders, Invoices, and POs. Replaces the three separate summary cards. Each cell is tappable and navigates to the corresponding tab.

```text
Props:
- workOrderCounts: { approved, pending, total }
- invoiceCounts: { approved, pending, total, amount }
- poCounts: { awaiting, inTransit, delivered, total }
- onNavigate: (tab: string) => void
- viewerRole: string
```

### 2. New Component: `src/components/project/FinancialSummaryCard.tsx`

A consolidated single-card replacement for `ProjectFinancialsSectionNew`. Shows headline number, 2x2 sub-metrics, progress bar. Has an "expand" toggle for full breakdown.

### 3. New Component: `src/components/project/AttentionBanner.tsx`

Enhanced version of the current alert banner. Shows categorized attention items with counts and action links.

### 4. Modify: `src/pages/ProjectHome.tsx`

- Replace the three-section layout with the two-zone layout
- Use `lg:grid-cols-[1fr_380px]` for desktop two-column split
- Stack vertically on mobile with reordered sections
- Integrate new MetricStrip, FinancialSummaryCard, and AttentionBanner
- Keep existing Team, Contracts, and Scope sections as context cards in Zone B

### 5. Modify: `src/components/project/ProjectTopBar.tsx`

- Make the tab row horizontally scrollable on mobile with `overflow-x-auto`
- Increase tab touch targets from `h-8` to `h-10`
- Add subtle gradient fade at edges when overflowing

### 6. Modify: `src/components/project/ProjectTeamSection.tsx`

- Increase font sizes in collapsed state summary
- Show role breakdown in collapsed header (e.g., "1 GC, 1 TC, 1 FC" instead of "3 active")
- Ensure 44px minimum touch targets

### 7. Modify: `src/components/project/ProjectContractsSection.tsx`

- Increase font sizes
- Show total contract value prominently in collapsed header
- Larger touch targets for edit controls

### 8. Modify: `src/components/project/ProjectScopeSection.tsx`

- Increase font sizes and badge sizes
- Show key scope facts in collapsed header

### 9. Modify: `src/index.css`

- No changes to CSS variables, just ensure the components use larger sizes

## What Stays the Same

- All data that is currently shown remains available (just reorganized)
- Dark sidebar navigation
- Wizard experiences (PO wizard, Work Order wizard, Project wizard) remain unchanged
- Individual tab content (SOV, Work Orders, Invoices, POs) remains unchanged
- Color system and brand identity
- The collapsible card pattern for context sections

## Implementation Order

1. Create new components (MetricStrip, FinancialSummaryCard, AttentionBanner)
2. Update ProjectTopBar for mobile scrolling
3. Update ProjectHome.tsx with new layout
4. Update context cards (Team, Contracts, Scope) for font sizes and touch targets
5. Test on both desktop and mobile viewports

