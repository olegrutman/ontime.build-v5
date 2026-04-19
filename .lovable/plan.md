

Yes — I understand. You want the **Project Overview** header to match the **Dashboard** header style (the new `DashboardHero` look from screenshot 2).

## What's different right now

**Dashboard header (the one you like)** — `DashboardHero.tsx`:
- Solid dark navy fill (`bg-[hsl(var(--foreground))]`), white text
- Eyebrow: `DASHBOARD` in `text-slate-500`, 0.7rem, uppercase, wide tracking
- H1: `Good evening, John` — `text-2xl font-semibold tracking-tight`
- Sub line: `GC_Test · General Contractor` in muted slate
- Inline status row: `Active 2   Setup 0   On Hold 0   Needs Attention 0` — labels in slate, values in white (or amber when > 0)
- `rounded-2xl`, compact `px-5 py-4`

**Overview header (current)** — rendered inline in `ProjectHome.tsx` ~line 350:
- Same dark navy treatment but uses different markup, eyebrow color, h1 weight, and a `Status / Health / Type` row with colored chips instead of clean inline counters
- Notification bell sits inside the banner (top-right)

## Plan

1. **Locate exact Overview header markup** in `src/pages/project/ProjectHome.tsx` (need to confirm the surrounding container + the bell button placement before swapping).
2. **Create `ProjectOverviewHero`** at `src/components/project/ProjectOverviewHero.tsx` — same visual recipe as `DashboardHero`:
   - Container: `bg-[hsl(var(--foreground))] text-white rounded-2xl px-4 sm:px-5 py-4`
   - Eyebrow: `PROJECT OVERVIEW` (`text-[0.7rem] uppercase tracking-widest text-slate-500 font-medium mb-1`)
   - H1: `{project.name}` (`text-2xl font-semibold tracking-tight truncate`)
   - Sub: `{address}` in `text-[0.8rem] text-slate-400 mt-0.5 truncate`
   - Inline row (replace chips with the same label/value pattern):
     `Status <Active>   Health <Healthy>   Type <apartments_mf>`
     - Labels: `text-slate-500`
     - Values: `text-white font-medium`
     - Health value gets amber/emerald color tint based on state (matches `Needs Attention` color logic in DashboardHero)
   - Right slot: keep the existing notification bell button (passed in via prop or rendered as a child) — top-right, same position as today
3. **Swap in `ProjectHome.tsx`**: replace the current header markup with `<ProjectOverviewHero project={...} health={...} bell={<NotificationBell ... />} />`. Don't touch anything below the header.

## Files to modify
- **Create**: `src/components/project/ProjectOverviewHero.tsx`
- **Edit**: `src/pages/project/ProjectHome.tsx` — swap header block only (~15 lines)

## Files NOT touched
- `DashboardHero.tsx` — it's the reference
- KPI grid, sub-header (status dot row + action buttons), everything below the banner

## Verification
- Side-by-side: Dashboard `/dashboard` and Overview `/project/:id/overview` headers use identical typography, spacing, eyebrow color, h1 size/weight, and inline label/value row pattern.
- Notification bell remains in the same spot on Overview.
- Mobile (390px): banner reflows cleanly, inline row wraps with `flex-wrap`.
- No regression in the action buttons row beneath the banner.

