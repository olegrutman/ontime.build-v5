

## What I see — the difference

I compared both pages live (TC user, Fuller Residence). They use the **same** `KpiCard` and `KpiGrid` primitives (4-col, `gap-2.5`), so the cards themselves are identical building blocks. The visual difference is **purely from the page wrappers**.

### Dashboard (`/dashboard`) — looks cramped
1. **Double-rendered sidebar bug**. `AppLayout → AppShell` already mounts `<DashboardSidebar />` on the left (`fixed`, with `lg:ml-[200px]` offset on the content). Then `TCDashboardView`, `GCDashboardView`, and `FCDashboardView` **render it again** (`<DashboardSidebar />` inside `<div className="flex gap-0">`). The second one takes a slot in the flex row, eating ~200px of horizontal space → KPI cards squeeze into a narrower column.
2. **Inconsistent padding**: TC view wraps content in `px-4 lg:px-5 space-y-4`, no `max-w-7xl`, no `mx-auto`. Combined with `fullWidth` on `AppLayout`, content stretches edge-to-edge with thin side gutters.
3. **Plain greeting** ("Good morning, Oleg" + 1-line subtitle) — no card, no eyebrow label, no status pill. Feels lightweight next to overview.

### Project Overview (`/project/:id/overview`) — what you like
1. Single sidebar (`ProjectSidebar`) handled by `ProjectShell`.
2. Content wrapped in `max-w-7xl mx-auto px-3 sm:px-6 py-3` (from `ProjectHome.tsx:340`) — generous, balanced gutters.
3. **Rich header card** above KPIs: dark navy banner with "PROJECT OVERVIEW" eyebrow, big project name, address, `Status / Health / Type` row.
4. Sub-header strip with status dot + role line + action buttons ("Submit Invoice", "View Contract").
5. KPI grid breathes naturally inside the wider container.

## What I'd change (apply Overview's polish to the Dashboard)

### Fix 1 — Remove the duplicate sidebar (the actual bug)
In `TCDashboardView.tsx`, `GCDashboardView.tsx`, `FCDashboardView.tsx`:
- Delete the `import { DashboardSidebar }` and the inline `<DashboardSidebar />` render.
- Replace `<div className="flex gap-0"> ... <div className="flex-1 min-w-0 space-y-4 px-4 lg:px-5">` with a single `<div className="space-y-4">`.

### Fix 2 — Match Overview's container
In `Dashboard.tsx`, drop `fullWidth` from the `AppLayout` calls for GC/TC/FC (keep for Supplier if intentional). `AppShell` then wraps content in `max-w-7xl mx-auto px-3 sm:px-5 md:px-6` — same rhythm as Overview.

### Fix 3 — Add a "Dashboard Hero" card matching Overview's header
Replace the plain greeting with a card styled like the Project Overview banner:

```text
┌─────────────────────────────────────────────────┐
│ DASHBOARD                                       │  ← eyebrow
│ Good morning, Oleg                              │  ← h1 name
│ IMIS, LLC · Trade Contractor                    │  ← sub
│ Active 3   Setup 0   On Hold 0   Needs 0        │  ← inline stats
└─────────────────────────────────────────────────┘
```

Same dark/tinted background, same `font-heading` h1, same eyebrow style. Below it: an action row with primary CTA (`+ New Project`) + secondary (`View Reminders`), mirroring Overview's "Submit Invoice / View Contract" row.

### Fix 4 — Tighten KPI grid spacing to match Overview rhythm
Keep `KpiGrid`'s `gap-2.5 lg:grid-cols-4` (already correct). The cards will naturally space out once the duplicate sidebar is removed and the `max-w-7xl` container is applied.

## Files to change
- `src/components/dashboard/TCDashboardView.tsx` — remove inline sidebar + flex wrapper, add hero card.
- `src/components/dashboard/GCDashboardView.tsx` — same.
- `src/components/dashboard/FCDashboardView.tsx` — same.
- `src/pages/Dashboard.tsx` — drop `fullWidth` from `AppLayout` for GC/TC/FC branches.
- (Optional) `src/components/dashboard/SupplierDashboardView.tsx` — verify it doesn't have the same double-sidebar issue.

## Files NOT touched
- `KpiCard.tsx`, `KpiGrid.tsx` — already correct, used by both pages.
- `ProjectShell.tsx`, `TCProjectOverview.tsx` — Overview is the reference, leave alone.
- `DashboardSidebar.tsx` — keep as-is, just stop double-mounting it.

## Verification
- `/dashboard` no longer shows two stacked sidebars (no duplicated nav, no narrowed content column).
- KPI cards have the same gutters and gap rhythm as `/project/:id/overview`.
- New dashboard hero card visually matches the Project Overview banner (eyebrow + h1 + sub + status row).
- Sidebar nav still works (Dashboard / Partners / Reminders / My Team / Settings).
- Test at 1366×768, 1536×864, and 390×844 — no layout overflow.

