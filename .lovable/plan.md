
# Project Overview Visual Redesign — Apple-Style Financial Dashboard

## Overview
Redesign the Project Overview page to match the reference image's premium, Apple-style aesthetic with a 3-column grid layout (desktop), hero contract card, and right sidebar for urgent tasks and team members. All existing financial logic and data sources remain intact — this is purely a visual and layout restructure.

## Current State
- Single-column stack of cards: ReadinessCard, AttentionBanner, MaterialResponsibilityCard, FinancialSnapshot (collapsible), BudgetTracking (collapsible), CollapsibleOperations
- Flat `border bg-card` styling with no rounded corners, no shadows
- No sidebar layout — everything stacks vertically

## New Layout Structure

### Desktop (lg+): 3-Column Grid
```text
+----------------------------------------------+------------------+
| HERO: Current Contract Total (full span)      | Urgent Tasks     |
|  $1,248,342                                   |  - item 1        |
|  Original Contract    + Approved WOs          |  - item 2        |
|  $1,180,000           + $68,342               |  - item 3        |
+----------------------+-----------------------+                  |
| Billing & Cash       | Material Budget       |                  |
| Position             | Control               +------------------+
| Invoiced  $920,000   | Estimate   $420,000   | Team Members     |
| Paid      $810,000   | Delivered  $438,000   |  Avatar Name     |
| Retainage  $92,000   | Variance   +$18K      |  Avatar Name     |
| Outstanding $110,000 |                       |  Avatar Name     |
+----------------------+-----------------------+------------------+
| Labor Budget (if set)                         |                  |
+----------------------------------------------+------------------+
| Scope Preview (collapsed)                                        |
+------------------------------------------------------------------+
```

### Mobile: Single column, cards stack vertically. Right sidebar content moves below financial cards.

## Design Tokens (Apple-style)
- Background: `bg-[#F5F5F7]` (light mode), keep existing dark mode
- Cards: `bg-white dark:bg-card rounded-2xl shadow-sm border-0`
- No heavy borders — rely on shadow and spacing
- Typography: Large `text-3xl font-bold` for hero number, `text-sm font-medium text-muted-foreground` for labels
- Spacing: `gap-4` between cards, `p-5` internal padding
- Color coding unchanged: green/amber/red for financial indicators

## Files Modified

### 1. `src/pages/ProjectHome.tsx` — New grid layout
- Replace the single `space-y-4` column with a responsive grid
- Desktop: `grid grid-cols-[1fr_280px]` — main content left, sidebar right
- Hero card spans full width of main column
- Billing and Material Budget sit side-by-side below hero
- Sidebar contains UrgentTasksCard and TeamMembersCard
- Mobile: single column, sidebar cards appear after financial cards
- Remove `CollapsibleOperations` wrapper — OperationalSummary moves into a "Scope & Activity" collapsible at the bottom
- Apply `bg-[#F5F5F7] dark:bg-background` to the main content area

### 2. `src/components/project/FinancialSnapshot.tsx` — Redesign as Hero Card
- Remove Collapsible wrapper — this is always visible, never collapsed
- Restructure into a "hero" card layout:
  - Top: Large "Current Contract Total" number centered
  - Below: Two-column sub-row: "Original Contract" | "+ Approved Work Orders"
  - Thin separator line between contract section and billing section
- Billing section becomes its own visual block within the card OR a separate card (matching reference image which shows Billing & Cash as its own card)
- **Split into two components**: `ContractHeroCard` and `BillingCashCard`
- Keep all contract editing (inline edit overlay) and FC contract creation logic
- All role-based rendering stays (GC/TC/FC/Supplier views)
- Apply new styling: `rounded-2xl shadow-sm bg-white dark:bg-card p-5`

### 3. `src/components/project/BudgetTracking.tsx` — Visual refresh
- Remove Collapsible wrapper — always visible
- Material Budget card gets its own standalone card with `rounded-2xl shadow-sm`
- Labor Budget card same treatment
- Side-by-side on desktop (within the main column), stacked on mobile
- Keep all inline editing logic
- Add "View Delivered PO Breakdown" link at bottom of material card (navigates to purchase-orders tab)
- Add projected impact warning line with amber icon when over budget

### 4. NEW: `src/components/project/UrgentTasksCard.tsx` — Right sidebar card
- Extracts attention items from existing `AttentionBanner` logic
- Card with "Urgent Tasks" header + three-dot overflow menu
- Each item: title, short description, assigned person, warning icon, due date
- Limit to 3-5 items visible
- Uses same data source as AttentionBanner (pending WOs, submitted invoices, POs awaiting pricing)
- Styled with `rounded-2xl shadow-sm bg-white dark:bg-card p-5`

### 5. NEW: `src/components/project/TeamMembersCard.tsx` — Right sidebar card
- Extracts team rendering from OperationalSummary
- Shows avatar, name, role for up to 5 members
- "View All" link at bottom
- Add team member button in header
- Designated supplier shown separately
- Styled with `rounded-2xl shadow-sm bg-white dark:bg-card p-5`

### 6. `src/components/project/OperationalSummary.tsx` — Slim down
- Remove Team section (moved to TeamMembersCard)
- Keep: Recent Work Orders, Recent Invoices, Open RFIs, Scope
- Wrap in a collapsible at the bottom of the page
- This becomes the "Activity & Operations" section

### 7. `src/components/project/AttentionBanner.tsx` — Keep for mobile
- On desktop (lg+), hide AttentionBanner since UrgentTasksCard handles it
- On mobile, continue showing the existing banner format

### 8. `src/components/project/index.ts` — Update exports
- Add UrgentTasksCard, TeamMembersCard exports

## ProjectHome.tsx Layout (Pseudo-JSX)

```text
<main className="bg-[#F5F5F7] dark:bg-background">
  <div className="max-w-7xl mx-auto p-4 sm:p-6">
    {/* Readiness card (setup/draft only) */}
    {setupMode && <ProjectReadinessCard />}
    
    {/* Material responsibility (only if not set) */}
    <MaterialResponsibilityCard />
    
    {/* Main grid */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        {/* Hero: Contract Total */}
        <ContractHeroCard financials={financials} />
        
        {/* Two-column: Billing + Material */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BillingCashCard financials={financials} />
          <MaterialBudgetCard financials={financials} />
        </div>
        
        {/* Labor (if budget set or GC/TC) */}
        <LaborBudgetCard financials={financials} />
        
        {/* Collapsible operations */}
        <CollapsibleOperations ... />
      </div>
      
      {/* RIGHT SIDEBAR (desktop) */}
      <div className="space-y-4">
        <UrgentTasksCard projectId={id} onNavigate={handleTabChange} />
        <TeamMembersCard projectId={id} />
      </div>
    </div>
    
    {/* Mobile: Urgent Tasks + Team (shown below on mobile) */}
    <div className="lg:hidden space-y-4 mt-4">
      <AttentionBanner ... />
    </div>
  </div>
</main>
```

## Role-Specific Behavior (Unchanged)
- **GC**: Sees contract hero, billing, material budget (if GC responsible), labor budget
- **TC**: Same + Live Position in hero card, outgoing FC contract
- **FC**: Simplified hero (contract with TC, earned WOs, billing)
- **Supplier**: Order Value/Invoiced/Paid/Outstanding in hero; no budget cards

## What Stays the Same
- All financial calculation logic in `useProjectFinancials.ts`
- All data sources and queries
- Contract editing inline flow
- FC contract creation flow
- Material/Labor budget inline editing
- Role detection and visibility rules
- ProjectReadinessCard logic
- MaterialResponsibilityCard logic

## Technical Notes
- No database changes needed
- No new dependencies
- All new components use existing UI primitives (Button, Input, Badge, Collapsible)
- The `rounded-2xl shadow-sm` card style is applied at the component level, not globally (preserves rest of app)
- Mobile responsive: sidebar collapses into single column below financial cards
