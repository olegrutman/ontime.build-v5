

# Build Linear-Style Demo Prototype at `/demo-v2`

## Overview
A self-contained demo route with hardcoded mock data showcasing the new navigation paradigm — no sidebar, no top nav, just a slim context bar + command palette. Two views: Dashboard and Project Overview. No changes to existing pages.

## New Files to Create

### Core Components
1. **`src/components/demo-v2/ContextBar.tsx`** — 52px frosted glass bar. Logo left, breadcrumb center, ⌘K button + avatar right. `backdrop-filter: blur(16px)` on navy/80%.

2. **`src/components/demo-v2/CommandPalette.tsx`** — ⌘K / Ctrl+K overlay modal. Search input + grouped results (Projects, Orders, Invoices, Crew). Scale+opacity entrance animation (180ms). Keyboard navigation.

3. **`src/components/demo-v2/BottomSheet.tsx`** — Framer-motion bottom sheet. Props: title, amount, 4 meta tiles, action buttons (Approve/Edit/Dismiss). `translateY(100%) → 0` with spring easing, 380ms. Backdrop overlay.

4. **`src/components/demo-v2/KpiCard.tsx`** — Stat card with 2px colored bottom accent. Animated counter on mount (ease-out cubic, 1.1s). Props: label, value, accent color, icon, subtitle.

5. **`src/components/demo-v2/ProjectCard.tsx`** — Expandable accordion card. Color dot, name, phase tag, contract value, % complete, thin progress bar. Expand reveals 4 stat tiles + action buttons. `max-height 0→260px`, 380ms cubic-bezier.

6. **`src/components/demo-v2/UrgentItem.tsx`** — Row with 3px colored left border, icon tile, title/subtitle, amount (IBM Plex Mono), status badge. Tap opens BottomSheet.

7. **`src/components/demo-v2/ActivityFeed.tsx`** — Scrollable timestamped events list. Avatar initials circle, bold name, description, colored chip.

8. **`src/components/demo-v2/BudgetRingChart.tsx`** — SVG donut chart with stroke-dashoffset animation (staggered 200/400/600ms). Legend below.

9. **`src/components/demo-v2/MobileBottomNav.tsx`** — Fixed bottom bar, navy bg, 5 items: Home, Orders, Invoices, Crew, Search. Hidden ≥900px.

10. **`src/components/demo-v2/mockData.ts`** — All hardcoded data: 5 projects, 5 orders, KPI values, activity feed entries, budget line items, field tasks.

### Pages
11. **`src/pages/DemoV2Dashboard.tsx`** — Dashboard view. ContextBar, 4 KPI cards (2-col mobile / 4-col desktop), "Your Projects" section with expandable ProjectCards, "Needs Attention" list, desktop right panel with ActivityFeed + mini portfolio list. FadeUp stagger animation (50ms per item).

12. **`src/pages/DemoV2ProjectOverview.tsx`** — Project detail view. Back button in ContextBar, breadcrumb trail, project hero card (navy bg, frosted radial gradient, 3 KPI tiles, progress bar), pill-style segment tabs (Budget / Orders / Field), master-detail split on desktop (340px left + right feed/chart panel), stacks on mobile.

### Routing
13. **`src/App.tsx`** — Add two routes: `/demo-v2` → DemoV2Dashboard, `/demo-v2/project/:id` → DemoV2ProjectOverview. No layout wrapper (these pages own their full layout).

## Design Tokens
- Navy: `#0D1F3C`, Amber: `#F5A623`
- Fonts: Import Barlow Condensed + IBM Plex Mono from Google Fonts (Barlow already available)
- Context bar: 52px height, `bg-[#0D1F3C]/80 backdrop-blur-xl`
- Progress bars: `transition-all duration-[1200ms] ease-out delay-200`
- All cards: `fadeUp` stagger with `animation-delay: ${index * 50}ms`

## What This Does NOT Touch
- No changes to existing `AppLayout`, `AppSidebar`, `TopBar`, `BottomNav`
- No changes to existing pages, hooks, or database queries
- Completely isolated under `/demo-v2` route

