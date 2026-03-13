

# Mobile-First Native App Optimization

This is a large scope touching ~15 files. The plan is organized into 4 implementation phases to keep changes manageable.

## Phase 1: Global Mobile Foundation

### `src/index.css` — Mobile base styles
- Add `@media (max-width: 767px)` block with:
  - Body font-size: 15px, line-height: 1.6
  - Card border-radius: 12px
  - Safe area padding on body (`env(safe-area-inset-*)`)
  - `.font-heading` titles bumped to 1.1rem uppercase
  - Minimum 44px touch targets on buttons/rows via utility class
  - `overscroll-behavior: contain` on scrollable areas
  - Hide scrollbar on tab rows

### `src/components/layout/AppSidebar.tsx` — Hide on mobile
- Add `hidden lg:flex` to the root `<Sidebar>` wrapper so it's fully hidden below 1024px

### `src/components/layout/TopBar.tsx` — Mobile topbar redesign  
- Height 52px on mobile
- Left: logo icon (28px) + wordmark
- Right: notification bell + CTA button (icon-only `+`, 36×36px navy)
- Remove SidebarTrigger text, separator on mobile
- Below topbar: full-width page title row (Barlow Condensed 900, 1.4rem) with subtitle

### `src/components/layout/BottomNav.tsx` — Native bottom nav
- Navy `#0F172A` background
- Height: 58px + safe area inset bottom
- 5 items: Home / Orders / Invoices / Crew / More
- Active: amber `#F5A623`, inactive: `rgba(255,255,255,.35)`
- Icon 24px + label 11px 600 weight
- 1px top border `rgba(255,255,255,.08)`

### `src/components/layout/AppLayout.tsx` — Content area mobile padding
- Reduce horizontal padding to 12px (`px-3`) on mobile
- Ensure `pb-20` for bottom nav clearance with safe area

## Phase 2: Dashboard Mobile

### `src/components/dashboard/DashboardKPIRow.tsx`
- Already 2×2 grid — confirm 8px gap on mobile
- Bump padding to 14px, label to .7rem, value stays 2rem Barlow Condensed 900
- Progress bar height: 4px on mobile
- Tag right-aligned as pill

### `src/components/dashboard/DashboardProjectsTable.tsx` — Stacked rows on mobile
- Below 768px: replace `<table>` with stacked card rows
- Each row: dot + project name + value right-aligned, phase + status pill, optional progress bar
- 14px 16px padding, min-height 60px, amber tint on tap

### `src/components/dashboard/DashboardRecentDocs.tsx` — Stacked rows
- Replace table with stacked items on mobile
- ID + type badge + status badge top row, description wraps, amount right-aligned

### `src/components/dashboard/DashboardBudgetCard.tsx`
- Contract total: Barlow Condensed 900 at 1.6rem on mobile
- Budget bar row padding: 14px gap, bar 6px height
- Variance text: .85rem

### `src/components/dashboard/DashboardNeedsAttentionCard.tsx`
- Min-height 56px per item on mobile
- Title: .82rem 600, subtitle: .72rem, amount: .82rem 700
- Left border: 3px, badge on own line if wrapping

### `src/components/dashboard/DashboardLiveFeed.tsx`
- Avatar: 30px, feed text: .8rem, name bold: .8rem, timestamp: .68rem
- Item padding: 10px 0

## Phase 3: Project Page Mobile

### `src/components/project/MobileProjectHeader.tsx`
- Increase height to 52px
- Left: back arrow (44px tap) + project name
- Right: status pill, download, bell, avatar — all 44px min tap targets
- Below header: full-width title band with Barlow Condensed 900 at 1.9rem

### `src/pages/ProjectHome.tsx` — Mobile tab pills
- Below 768px: horizontally scrollable pill row replacing bottom-nav tab switching
- Pill style: #F5F6F9 bg, 1px border, 7px radius, .8rem font
- Active: navy bg, white text
- Row height 44px, scroll-snap, hidden scrollbar

### `src/components/project/ContractHeroCard.tsx` — Mobile stats
- Stack vertically on mobile
- Progress bar: 10px height
- Stats grid (Contract / Invoiced / Days): 3-col horizontal, labels .65rem, values Barlow Condensed 900 1.2rem

### `src/components/project/TeamMembersCard.tsx`
- Avatar: 32px, name: .85rem 600, role: .72rem, min row height: 52px

## Phase 4: Shared Component Patterns

### Empty states
- Centered: emoji 1.8rem + message .82rem muted + optional action button
- Min-height 80px

### Touch targets
- Apply `min-h-[44px]` to all tappable elements consistently via mobile media query or utility

## Files Changed (total ~15)

| File | Change Type |
|------|-------------|
| `src/index.css` | Add mobile foundation styles |
| `src/components/layout/AppSidebar.tsx` | Hide on mobile |
| `src/components/layout/TopBar.tsx` | Mobile topbar redesign |
| `src/components/layout/BottomNav.tsx` | Native navy bottom nav |
| `src/components/layout/AppLayout.tsx` | Mobile padding |
| `src/components/dashboard/DashboardKPIRow.tsx` | Mobile spacing/sizing |
| `src/components/dashboard/DashboardProjectsTable.tsx` | Stacked rows |
| `src/components/dashboard/DashboardRecentDocs.tsx` | Stacked rows |
| `src/components/dashboard/DashboardBudgetCard.tsx` | Mobile sizing |
| `src/components/dashboard/DashboardNeedsAttentionCard.tsx` | Mobile sizing |
| `src/components/dashboard/DashboardLiveFeed.tsx` | Mobile sizing |
| `src/components/project/MobileProjectHeader.tsx` | Redesign |
| `src/pages/ProjectHome.tsx` | Mobile tab pills |
| `src/components/project/ContractHeroCard.tsx` | Mobile layout |
| `src/components/project/TeamMembersCard.tsx` | Mobile sizing |

## Implementation Note
Due to the scope (~15 files with significant changes), this will be implemented across 2-3 messages. Phase 1 (global foundation + layout) first, then Phase 2 (dashboard), then Phase 3-4 (project page + shared patterns).

