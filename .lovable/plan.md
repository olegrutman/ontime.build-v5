

# Restyle Production App Content to Match Demo-V2 (Light Theme)

## The Gap
The Phase 1-4 migration only swapped the **navigation chrome** (sidebar → context bar, command palette, bottom nav). The actual **page content** — cards, KPIs, project lists, attention items — still uses generic shadcn/ui card styling. Demo-v2 has distinct visual patterns that were never ported.

## Key Visual Differences

| Element | Demo-V2 | Current Production |
|---|---|---|
| KPI Cards | 2px bottom accent, compact, animated counter | Has accent + counter (already migrated) |
| Project List | Expandable accordion cards with color dots, progress bars, stat tiles | Flat row list with status dots, no expand |
| Urgent Items | 3px left border, icon tile, monospace amounts, status badge | Emoji-based, similar border but different feel |
| Activity Feed | Right sidebar with avatar circles, timestamped | No activity feed on dashboard |
| Layout | Two-column: content left, activity/portfolio right | Two-column but right has budget/reminders |
| Project Detail | Hero card with radial gradient, segment pill tabs, SVG donut chart | Standard cards, icon rail nav |
| Bottom Sheets | Framer-motion spring sheet for actionable items | Not implemented |
| Typography | Barlow Condensed headings, IBM Plex Mono for $, consistent sizing | Mixed, some Barlow Condensed |

## Plan — Bring Demo-V2 Visual Language to Production Content

### 1. Restyle `DashboardProjectList.tsx`
- Replace flat row layout with **expandable accordion cards** matching `demo-v2/ProjectCard.tsx`
- Color dot + project name + phase tag + contract value + % complete
- Thin progress bar with animated width on mount
- Expand reveals 4 stat tiles (Contract, Paid, Pending, Status) + action buttons (View Project, Orders, Budget)
- Keep existing status filter tabs, dropdown actions, and real data bindings
- Use light surfaces: `bg-card border border-border rounded-lg` instead of `bg-[#0D1F3C]`

### 2. Restyle `DashboardNeedsAttentionCard.tsx`
- Replace emoji indicators with **colored icon tiles** (FileText, Wrench, Truck, GitBranch)
- IBM Plex Mono for dollar amounts
- Colored status badges with subtle background
- 3px left border matching item type color
- Keep existing invite accept/decline functionality

### 3. Add Activity Feed to Dashboard Right Column
- Create `src/components/dashboard/DashboardActivityFeed.tsx`
- Light-theme version of `demo-v2/ActivityFeed.tsx`
- Query real recent activity from Supabase (project updates, invoice changes, etc.) or show recent docs transformed into feed format
- Avatar initials circle, bold name, description, relative timestamp

### 4. Add Bottom Sheet for Actionable Items
- Create `src/components/app-shell/BottomSheet.tsx` — light-theme fork of `demo-v2/BottomSheet.tsx`
- Uses framer-motion (already installed), white surface, navy text
- Wire up to attention items on dashboard and order/invoice items on project pages

### 5. Restyle Project Overview Hero Card
- Update `ContractHeroCard.tsx` with radial gradient background using project accent color
- Add animated progress bar, Barlow Condensed heading, 3 KPI mini-tiles
- Match demo-v2's hero card pattern but on light surfaces

### 6. Add Segment Pill Tabs to Project Detail
- Create a pill-style tab switcher for project sub-sections (currently handled by icon rail)
- Visible on mobile as horizontal scrollable pills above content
- Works alongside the existing icon rail on desktop

### 7. Typography & Spacing Polish
- Ensure all dollar amounts use `font-family: 'IBM Plex Mono'`
- Section headers: `text-[11px] uppercase tracking-wider text-muted-foreground font-medium`
- Consistent `fadeUp` stagger animation on card lists
- Card spacing: `gap-2` or `gap-3` matching demo-v2 density

### Files Changed
- `src/components/dashboard/DashboardProjectList.tsx` — accordion card restyle
- `src/components/dashboard/DashboardNeedsAttentionCard.tsx` — icon tile + monospace restyle
- `src/components/dashboard/DashboardActivityFeed.tsx` — new, real-data activity feed
- `src/components/app-shell/BottomSheet.tsx` — new, light-theme bottom sheet
- `src/components/project/ContractHeroCard.tsx` — radial gradient hero restyle
- `src/pages/Dashboard.tsx` — swap DashboardRecentDocs for ActivityFeed in right column
- `src/index.css` — any missing animation keyframes

### Files NOT Changed
- Navigation components (already migrated)
- Database, edge functions, auth
- Existing hooks and data fetching logic

