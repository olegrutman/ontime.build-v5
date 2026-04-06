

# Build GC KPI Dashboard Page

## What I'm Building

A dedicated GC (General Contractor) KPI dashboard page — a self-contained, visually rich page that shows a GC's entire portfolio health at a glance. It faithfully translates the uploaded HTML reference into a React/Tailwind component using the exact design system (Barlow Condensed for values, IBM Plex Mono for dollar amounts, DM Sans for body, navy/amber color palette).

The page lives at `/platform/gc-dashboard` within the existing platform admin area and contains:

- **8 expandable KPI cards** in a 4-column responsive grid (Total Owner Budget, GC Profit Margin, Change Orders, Materials Budget, Open RFIs, Paid Invoices, Pending Approvals, TC Contracts)
- **Portfolio Metrics table** (full-width summary with inline progress bars)
- **"Needs Immediate Attention" warnings section** (7 warning items with severity-colored left borders)
- **All Projects grid** (5 project cards with progress bars and status pills)

Each KPI card has collapsed/expanded states with smooth CSS transitions, inner data tables, status pills, and inline progress bars — all matching the uploaded HTML pixel-for-pixel.

## Technical Approach

### Single file, all hardcoded data

Create `src/pages/platform/PlatformGCDashboard.tsx` as one large component file. All dummy data (5 projects, their financials, RFIs, COs, invoices, materials) defined as TypeScript `const` arrays at the top. No database queries, no hooks — pure presentational.

### Component structure inside the file

1. **Data constants** — TypeScript interfaces + hardcoded project/invoice/CO/RFI/materials arrays (matching the HTML's `P`, `TC`, `FC`, `SUP` objects exactly)
2. **Utility functions** — `formatDollar()` (K/M formatting), `pct()`, status-to-pill-class mapping
3. **Sub-components** (all in same file):
   - `KpiCard` — the expandable card with accent bar, icon, pills, value, footer toggle, expand body slot
   - `InnerTable` — thead/tbody with the exact styling classes
   - `StatusPill` — pill component with 6 color variants (pg/pr/pa/pb/pm/pw)
   - `ProgressBar` — 4px inline bar with color fill
   - `WarnItem` — warning row with left border, icon, text, value, badge
   - `ProjectCard` — grid card with dot, name, phase, bar, value, pill
4. **Main `PlatformGCDashboard`** — assembles everything with `PlatformLayout`

### Styling

All inline Tailwind utilities + a small `<style>` block (or utility classes in index.css) for:
- Card expand/collapse transition: `max-h-0 → max-h-[700px]`, `transition-all duration-[440ms] ease-[cubic-bezier(.22,1,.36,1)]`
- Stagger animation: each card gets `animation-delay: n * 0.04s`
- Font families applied via inline style (Barlow Condensed, IBM Plex Mono) matching existing `.kpi-value` patterns

### Responsive grid
- 4 columns default → 3 at 1100px → 2 at 860px → 1 at 580px

### Routing + nav

| File | Change |
|------|--------|
| `src/pages/platform/PlatformGCDashboard.tsx` | **New** — entire GC dashboard page |
| `src/App.tsx` | Add lazy import + `/platform/gc-dashboard` route inside `RequirePlatformRole` |
| `src/components/platform/PlatformSidebar.tsx` | Add "GC Dashboard" nav item with `Briefcase` icon |

### Card expand behavior
- Multiple cards can be open simultaneously
- Click card top area OR footer strip to toggle
- Chevron rotates 90deg when open
- Border changes to amber + glow shadow when open
- Row clicks in tables log `console.log('navigate → [project] [section]')` as routing stubs

### Data accuracy
All 8 cards use the exact dummy values from the spec (Cherry Hills $420K, Tower 14 $680K, Mesa $290K, Apex $520K, Hyatt $740K; total $2.65M; margin $789K at 30%; 14 COs totaling $53.2K; 19 open RFIs; $800K paid; $100.9K pending; $1.861M TC committed; $192.3K materials). The portfolio metrics table, warnings section, and project grid all use the same data.

