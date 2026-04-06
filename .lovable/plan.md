

# Build TC KPI Dashboard

## What I'm Building

A dedicated Trade Contractor dashboard view (`TCDashboardView`) that replaces the current TC dashboard layout at `/dashboard` when `orgType === 'TC'`. It follows the identical expandable KPI card pattern already built for GCs — same design tokens, same `KpiCard`/`Pill`/`Bar` sub-components, same expand/collapse transitions.

The TC perspective is fundamentally different from GC: the TC sits between GC (upstream revenue) and FC (downstream cost). All 8 cards reflect this hierarchy.

## Cards

1. **GC Contracts (Revenue)** — Total revenue from GC contracts, expand shows per-project GC contract vs FC cost vs margin
2. **FC / Labor Contracts (Cost)** — Total FC/sub costs, same data different focus column
3. **Gross Margin** — GC minus FC, margin percentages
4. **CO Net Margin** — 10 change orders showing what TC billed GC vs paid FC, net profit per CO
5. **Received from GC** — Payments collected, % collected per project with progress bars
6. **Pending from GC** — Outstanding invoices awaiting GC approval, with "Follow Up" stubs
7. **TC Material Budget** — Two-section expandable (Cherry Hills + Tower 14 material packs, same data as GC materials card)
8. **Open RFIs** — Per-project RFI sections for 3 projects

Plus: "Action Required" warnings section (4 items) and "My Projects" grid (3 project cards).

## Technical Approach

### New file: `src/components/dashboard/TCDashboardView.tsx`

Single self-contained component file. Copies the `KpiCard`, `Pill`, `Bar`, font/color constants from `GCDashboardView.tsx` (same design system). All dummy data hardcoded as `const` arrays at the top. Maps real data from props where available, falls back to dummy data for demo richness.

Props interface mirrors `GCDashboardView` — receives `projects`, `financials`, `billing`, `attentionItems`, `recentDocs`, `statusCounts`, `profile`, `pendingInvites`, plus onboarding/settings props.

### Layout
- 3-column grid for cards (not 4 like GC, per spec)
- Responsive: 3 → 2 → 1 columns
- Same stagger animation, same expand transitions

### Edit: `src/pages/Dashboard.tsx`

Add a TC branch after the GC branch:

```tsx
if (orgType === 'TC') {
  return (
    <AppLayout ...>
      <TCDashboardView ... />
      {/* action dialogs */}
    </AppLayout>
  );
}
```

The existing TC fallback (DashboardKPIs + grid layout) moves to FC-only.

### Files changed

| File | Change |
|------|--------|
| `src/components/dashboard/TCDashboardView.tsx` | **New** — TC dashboard with 8 expandable KPI cards, warnings, project grid |
| `src/pages/Dashboard.tsx` | Add TC branch rendering `TCDashboardView` |

### What is NOT changing
- GC dashboard view
- FC/Supplier dashboard views
- `useDashboardData` hook
- Database, RLS, routes

