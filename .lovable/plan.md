

# Redesign: Apply Demo-V2 Design Language to Production App (Light Theme)

## What I Understand

You want to **replace the current sidebar + top bar layout** with the demo-v2 navigation pattern (slim context bar, command palette, mobile bottom nav, bottom sheets) across the **real production app** — keeping all existing functionality, real data, auth, SOV editing, etc. The visual theme should be **light** (white/light gray surfaces) instead of the dark navy used in demo-v2. Navy and amber remain as accent colors.

This is a **large migration** — 20+ pages use `AppLayout`. I recommend doing it in phases so nothing breaks. Here is Phase 1 covering the global shell and the Dashboard.

---

## Phase 1: Global Layout Shell + Dashboard

### 1. Create Light-Theme Versions of Demo-V2 Components

New folder: `src/components/app-shell/`

- **`ContextBar.tsx`** — Same structure as demo-v2 but light: `bg-white/80 backdrop-blur-xl border-b border-border`. Navy text, amber logo. Breadcrumbs from route context. Integrated ⌘K button + user avatar dropdown (with Profile, Settings, Sign Out — pulled from current TopBar/Sidebar logic).

- **`CommandPalette.tsx`** — Fork of demo-v2 version but queries **real data** (projects from Supabase, routes for navigation). Light surfaces (`bg-white`), navy text. Same scale+opacity animation.

- **`MobileBottomNav.tsx`** — Light version: `bg-white border-t border-border`. 5 items: Home, Partners, Reminders, RFIs, More. Amber active state. Same items as current BottomNav but styled to match.

- **`AppShell.tsx`** — New layout wrapper replacing `AppLayout`. No sidebar. Structure:
  ```
  ContextBar (fixed top, 52px)
  main (pt-[52px], pb-24 on mobile)
    max-w-[1400px] centered content
  MobileBottomNav (fixed bottom, mobile only)
  CommandPalette (overlay)
  ```

### 2. Update `AppLayout.tsx`

Replace the sidebar-based layout with `AppShell`. The component keeps the same props interface (`title`, `showNewButton`, etc.) so **all 20+ pages continue working unchanged**. Internally it renders:
- `ContextBar` with breadcrumb derived from `title` prop + route
- `CommandPalette` with real project data
- Content area (children)
- `MobileBottomNav`

The old `AppSidebar`, `TopBar`, and `BottomNav` components remain in the codebase but are no longer imported.

### 3. Light Theme Color Adjustments

All demo-v2 components used hardcoded dark colors (`bg-[#0D1F3C]`, `text-white/40`). The new app-shell versions use Tailwind theme tokens instead:
- Cards: `bg-card border border-border rounded-lg`
- Text: `text-foreground`, `text-muted-foreground`
- Subtle backgrounds: `bg-muted/30` or `bg-accent`
- Accent highlights: `text-primary` (amber), `bg-primary`
- The existing CSS variables in `index.css` already define a light theme — we use those.

### 4. Dashboard Enhancements

Update `DashboardKPIRow` to use the animated counter pattern from demo-v2's `KpiCard` (ease-out cubic, 1.1s) with the 2px colored bottom accent line — but on light card surfaces.

Add `fadeUp` stagger animation to project list and attention items (CSS keyframe already exists from demo-v2).

### Files Created
- `src/components/app-shell/ContextBar.tsx`
- `src/components/app-shell/CommandPalette.tsx`
- `src/components/app-shell/MobileBottomNav.tsx`
- `src/components/app-shell/AppShell.tsx`

### Files Modified
- `src/components/layout/AppLayout.tsx` — swap internals to use AppShell
- `src/components/dashboard/DashboardKPIRow.tsx` — add counter animation + accent line
- `src/index.css` — add `fadeUp` keyframe globally

### Files NOT Modified
- All page components (Dashboard, ProjectHome, Partners, RFIs, etc.) — they keep rendering inside `AppLayout` as before
- `AppSidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx` — kept but unused (safe rollback)
- No database or edge function changes

---

## Future Phases (not in this plan)
- Phase 2: Project detail pages — master-detail split, segment tabs, bottom sheets for actionable items
- Phase 3: Bottom sheet pattern for invoices, POs, work orders across all pages
- Phase 4: Remove old layout components entirely

