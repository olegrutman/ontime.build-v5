

# Full Redesign — Work Order Detail Page

## Overview
Complete UI-only rebuild of the WO detail page. All data hooks, mutations, props, and Supabase calls remain unchanged. Only the visual layer is rewritten.

## Scope of Work

This is a large redesign touching **6 files** (rewrite) and **2 files** (minor adjustments). The plan is split into phases to keep each change manageable.

---

## File Changes

### 1. `CODetailLayout.tsx` — Full rewrite of page structure

**Current**: Header strip, KPI strip, hero block, contextual alert, two-column layout with inline main content.

**New structure**:
- **Sticky topbar**: Back arrow + breadcrumb + "Duplicate" and "⋯" ghost buttons (right side). Remove the status badge from topbar.
- **WO Header Card** (full-width, spans both columns): Top = WO number (monospace) + large title (Barlow Condensed) + tag pills (location, category, date, status) + TC name/avatar right-aligned. Bottom = 5-step status pipeline (Created → Pricing → Review → Submitted → Approved) with checkmarks for completed, amber glow for active, grey for future. Separated by a top border on a light surface.
- **Next Action Banner**: Full-width navy card replacing `COHeroBlock`. Icon box + "Next Action Required" label + bold title + subtitle + 1-2 action buttons. Dynamic content derived from the same `getCards` logic but rendered as a single banner instead of a card grid.
- **KPI Row**: 4 cards always, using design-token colors. Labels in plain English: "Field Crew Cost", "My Billable (Labor)", "Materials + Equipment", "Total to GC". Top accent bars with Barlow Condensed values.
- **Two-column layout**: Main (flex-1) + Sidebar (w-[300px] sticky). Remove `COTeamCard` from main (team info absorbed into header). Remove `COWhosHere` and `COAcceptBanner` from above the body — integrate accept banner into the Next Action Banner when relevant.
- **Responsive**: Below 900px sidebar stacks below. KPI grid 2x2.

### 2. `COLineItemRow.tsx` — Full rewrite of scope line items

**Current**: Left border stripe, numbered index, status chip, collapsible history, auto-expand form.

**New**:
- 3px left amber border stripe
- Amber-numbered index circle (far left)
- Bold item name + meta chips (category, unit, pricing status) + 2-line plain text description (strip markdown asterisks)
- Right side: monospace billable amount + green "Internal / $X" pill (or grey "Internal / Not logged") + margin % chip
- Clicking row toggles entries panel
- **Entries panel** (expanded): Light grey bg, column headers (Date, Description, Hours, Billable, Internal Cost w/ lock, delete). Each entry row shows all 5 columns. No internal cost = subtle "+ add cost" grey link.
- **Add pricing entry toggle bar**: Plus icon + "Add pricing entry" + sub-label "Log hours, flat rate, or unit pricing". Expands inline form below.
- **Empty state**: Money icon + "No pricing added yet" + explanation + same toggle bar.
- **Bottom of card**: Full-width "＋ Add another scope item" dashed row, amber on hover.

### 3. `LaborEntryForm.tsx` — Visual reskin to match amber-themed inline form

**Current**: Primary-colored border and tiles, emerald save button.

**New**:
- Amber border (2px) + amber-tinted header ("Add pricing entry" with amber bg)
- Entry type tiles: amber border + pale amber bg when selected (instead of primary)
- Form fields in 2-col grid (Description + Date, Hours + Billable Amount)
- Live margin preview: green bg panel
- Internal cost section: open by default, lock icon, "Private · optional" green badge, note about privacy, fields for Your Cost + Cost Type dropdown (Labor wages, Subcontractor, Materials, Equipment, Other)
- Footer: Cancel (ghost) + "Save Entry ✓" amber button (replace emerald)

### 4. `COKPIStrip.tsx` — Update labels and ensure 4 cards always

**Current**: Dynamic number of tiles, abbreviated labels like "FC cost", "Mat + Equip".

**New**: Always 4 tiles with plain English labels. Sub-labels (e.g., "52 hrs logged"). Status badges. Design tokens: Navy (#0D1F3C), Amber (#F5A623), Green (#059669).

### 5. `COSidebar.tsx` — Redesign into 3 distinct cards

**Current**: Budget tracker + status actions + financials + profitability + SOV + FC pricing toggle + FC input + NTE.

**New 3 cards**:
- **Actions card** (navy bg): "Actions" label, current status with pulsing amber dot, large amber "Submit for Approval" button, two secondary ghost buttons. Wraps existing `COStatusActions` logic.
- **Financials card** (white): Billable to GC, Equipment, Materials, divider, Total to GC bold. Below: TC Profitability section — Revenue, Internal Costs, green-highlighted margin block with $ + % + thin bar. Margin always visible (no eye icon).
- **Field Crew card** (white): Title, status text, dropdown, "Request FC Input" amber button. Wraps existing `FCInputRequestCard` logic.

### 6. `COHeaderStrip.tsx` — Replace with new WO Header Card + Pipeline

Completely rewrite to include the status pipeline visualization. The pipeline component reads `co.status` and maps it to the 5 steps.

### 7. Minor updates
- `COHeroBlock.tsx` → Repurpose as `CONextActionBanner.tsx` (single navy banner instead of card grid). Same data logic, different render.
- `COContextualAlert.tsx` → Remove (absorbed into Next Action Banner).
- `COProfitabilityCard.tsx` → Remove as standalone; merged into sidebar financials card.
- `COStickyFooter.tsx` → Keep, minor style updates (amber button style).

## Design Tokens Used
- Navy: `#0D1F3C`, Amber: `#F5A623`, Background: `#F0F2F7`, Surface: `#FFFFFF`, Border: `#E4E8F0`, Green: `#059669`, Red: `#DC2626`
- Border radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for components
- Fonts: Barlow Condensed (headings/numbers), IBM Plex Mono (currency/IDs), DM Sans (body)
- Subtle box shadows throughout

## What stays the same
- All data hooks (`useChangeOrderDetail`, `useCORoleContext`, etc.)
- All mutations and Supabase calls
- All prop interfaces and data flow
- `AddScopeItemButton`, `COMaterialsPanel`, `COEquipmentPanel` components (minor wrapper styling only)
- `COActivityFeed` component (wrapped in collapsible card)
- Database schema and RLS policies
- Mobile sticky footer behavior

## Estimated file count: ~8 files modified/created

