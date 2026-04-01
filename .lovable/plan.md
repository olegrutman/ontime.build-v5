

# CO Detail Page Redesign — All Roles

## Summary
Replace the current tab-based slide-over (desktop) and accordion-based job ticket (mobile) with a unified hero-first layout that treats each CO like a "project within a project." Every role lands on their most important action first via a dark navy Hero Block with 2x2 action tiles.

## Architecture

### New Components
| Component | Purpose |
|-----------|---------|
| `COHeroBlock.tsx` | Dark navy card with role+status-driven 2x2 action grid |
| `COKPIStrip.tsx` | 4-tile KPI row with colored top borders, role-filtered values |
| `COHeaderStrip.tsx` | White panel: CO number, title, meta chips, role pill |
| `COHourEntryInline.tsx` | Navy panel with giant number, quick-tap pills (FC only, replaces InlineHourEntry on mobile) |
| `CODetailLayout.tsx` | Unified layout shell: topbar + header + hero + two-column content |
| `COSidebar.tsx` | Right sidebar (300px): financials, FC toggle, details, parties |
| `COStickyFooter.tsx` | Mobile-only sticky bottom action button |

### Modified Components
| Component | Change |
|-----------|--------|
| `COSlideOver.tsx` | Replace tab structure with `CODetailLayout` (two-column, scroll sections) |
| `COJobTicket.tsx` | Replace accordion layout with hero + inline panels approach |
| `COListPage.tsx` | Restyle to dashboard card grid with KPI strip + filter pills + colored-border cards |
| `COBoardCard.tsx` | Add 3px colored top border, progress bar, role avatar stack |
| `FCHomeScreen.tsx` | Use shared `COHeroBlock` classes for the 2x2 grid |
| `COContextualAlert.tsx` | Restyle as full-width pill with inline action button |
| `COWhosHere.tsx` | Restyle as green-tinted strip between topbar and header |

### Unchanged (logic preserved)
- All Supabase queries/mutations/hooks (`useChangeOrderDetail`, `useCORealtime`, `useCORoleContext`)
- `COStatusActions` (all status transition logic)
- `COWizard`, `QuickLogWizard` (just button style updates)
- `CONTEPanel`, `COMaterialsPanel`, `COEquipmentPanel` (logic intact, headers restyled)
- Role resolution, financial privacy rules

## Detailed Design

### 1. Shared Topbar
- Sticky, full-width (no sidebar on CO detail)
- Back arrow → CO list, breadcrumb: `Project Name > Change Orders > CO-008`
- Right: status badge + role-specific primary action button

### 2. CO Header Strip
- CO number in small mono caps + title in Barlow Condensed 800 ~1.5rem
- Meta row: location chip, reason chip, date chip, submitted-ago chip
- Role pill + user name (top-right)
- KPI strip (4 tiles, 3px colored top borders):
  - **GC**: Labor billed, Materials, Equipment, Total to approve
  - **TC**: FC cost, My billable, Materials+Equip, Total to GC
  - **FC**: My hours logged, Status (no pricing)

### 3. Hero Block (`COHeroBlock.tsx`)
Dark navy card (`#0D1F3C`, border-radius 16px). Eyebrow + headline (amber, Barlow Condensed 800) + hint text + 2x2 action grid.

Card variants: `primary` (amber bg), `secondary` (white/5% bg), `green-card` (green/15%), `red-card` (red/15%).

**GC (submitted):** green full-width "Approve $18,400" + "Reject" + "Budget impact"
**GC (WIP):** "Close for pricing" + "Review cost" + "FC involvement" + "View scope"
**TC (closed_for_pricing):** primary full-width "Submit $X to GC" + "Use FC base" + "Add materials"
**TC (WIP):** "Request hours from FC" + "Close for pricing" + "Add materials" + "Review scope"
**FC (active):** "Log my hours" + "Submit to TC" + "Need material" + "Saw damage"

Tapping executes action directly or scrolls to relevant panel.

### 4. Contextual Alert Bar
Full-width pill below hero, role+status aware. Inline action button on right. Colors: warn=yellow, info=blue, success=green, danger=red.

### 5. Main Content — Two Column (desktop), Single Column (mobile)
**Left (flex: 1):** Scope & Labor, Materials, Equipment, Activity — each with Barlow Condensed uppercase card headers
**Right (300px fixed):** Financials (role-filtered), FC Pricing Toggle, Details, Parties

### 6. FC Hour Entry Panel (mobile, replaces InlineHourEntry)
Navy background panel with:
- Giant number (Barlow Condensed 900, 4rem, amber)
- Quick-tap pills: 2h · 4h · 8h · + (custom)
- Date selector, description textarea
- Preview bar + green submit button

### 7. Sticky Footer (mobile only)
Fixed bottom, full-width rounded button:
- FC: green "Submit X hours to TC"
- TC: amber "Submit $X to GC" or muted "Waiting on FC"
- GC: green "Approve $X"

### 8. CO List Page Restyle
- Header card with title, filter pills, 4-tile KPI strip
- Card grid (`repeat(auto-fill, minmax(300px, 1fr))`)
- Each card: 3px status-colored top border, mono CO number, progress bar, role avatar stack + amount

### 9. Who's Here
Green-tinted strip between topbar and header. Shows avatars + activity text. Only renders when others present.

## Design Tokens
```
--navy: #0D1F3C
--amber: #F5A623
Barlow Condensed 800/900 headings
IBM Plex Mono amounts/IDs
border-radius: 12px cards, 8px chips
```

## Files Summary
| File | Action |
|------|--------|
| `src/components/change-orders/COHeroBlock.tsx` | **New** |
| `src/components/change-orders/COKPIStrip.tsx` | **New** |
| `src/components/change-orders/COHeaderStrip.tsx` | **New** |
| `src/components/change-orders/COHourEntryInline.tsx` | **New** |
| `src/components/change-orders/CODetailLayout.tsx` | **New** |
| `src/components/change-orders/COSidebar.tsx` | **New** |
| `src/components/change-orders/COStickyFooter.tsx` | **New** |
| `src/components/change-orders/COSlideOver.tsx` | Rewrite to use new layout |
| `src/components/change-orders/COJobTicket.tsx` | Rewrite to use new layout |
| `src/components/change-orders/COListPage.tsx` | Restyle card grid + KPI |
| `src/components/change-orders/COBoardCard.tsx` | Add colored border, progress bar, avatars |
| `src/components/change-orders/FCHomeScreen.tsx` | Use shared hero-card classes |
| `src/components/change-orders/COContextualAlert.tsx` | Restyle as pill |
| `src/components/change-orders/COWhosHere.tsx` | Restyle as green strip |
| `src/components/change-orders/COMaterialsPanel.tsx` | Barlow Condensed header |
| `src/components/change-orders/COEquipmentPanel.tsx` | Barlow Condensed header |
| `src/components/change-orders/CONTEPanel.tsx` | Barlow Condensed header |

