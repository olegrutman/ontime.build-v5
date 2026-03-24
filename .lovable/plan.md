

# Kanban Board + Slide-Over Detail Panel — Understanding Confirmation

## 1. Five Kanban Columns and Status Mapping

| Column | Label | Color | CO Statuses Mapped |
|--------|-------|-------|--------------------|
| 1 | Work in progress | Blue #2563EB | `draft`, `shared`, `work_in_progress` |
| 2 | Pending pricing | Amber #F5A623 | `closed_for_pricing` |
| 3 | GC review | Amber, highlighted + badge count | `submitted` |
| 4 | Approved — billable | Green #059669 | `approved` |
| 5 | Invoiced / Paid | Gray, muted | `contracted` |

`rejected` COs appear in column 1 (work in progress) since they go back into the work cycle. Drag-and-drop between columns enforces the existing status machine — no skipping (e.g., cannot drag from column 1 to column 4).

## 2. Card Design

Each card has:
- **3px left-edge color stripe** encoding CO type: blue = scope add (`addition`), purple = T&M (`tm` pricing), amber = material sub (material-heavy), green = unit price (`fixed`), red = deduction (if applicable). Mapped from `pricing_type` and `reason` fields.
- **CO ID** in monospace (gray, top-left) — `co_number`
- **CO type badge** (top-right) — derived from `pricing_type`
- **CO title** (2 lines max, `line-clamp-2`)
- **Status waiting badge** with pulsing dot — context-sensitive text like "Pricing open", "Your approval", "Waiting: TC, FC" based on role and status
- **Horizontal progress bar** (3px thin) — indicates lifecycle progress based on status position in the 5-column flow
- **Footer**: party avatar circles (GC=blue, TC=green, FC=amber colored circles with initials) + dollar amount (from `financials.grandTotal` or role-appropriate total)
- **Hover**: lift with shadow (`hover:shadow-lg`), border deepens
- **Active** (panel open for this CO): amber border glow ring (`ring-2 ring-[#F5A623]`)

## 3. Slide-Over Panel — Four Tabs

Panel opens from right, `min(660px, 100vw)` wide. Overlay behind: `rgba(7,14,29,.45)` + `blur(2px)`. Board stays visible and scrollable behind overlay.

**Panel header**: Close (X), CO ID (mono), title (truncated), status pill, context-sensitive action buttons (Approve/Reject/Submit Pricing/Mark Complete/Acknowledge/Create Invoice) — reusing existing `COStatusActions` logic.

**Who's Here Bar**: Navy background below header. Pulsing green dot + avatars of users viewing this CO + count label. Right-aligned live activity text (e.g., "TC is entering pricing…"). This requires Supabase Realtime presence on a per-CO channel.

**Role Banner** (first element in body):
- GC (blue): "You are viewing as GC. TC and FC pricing is hidden from your view. You see only the TC's final price."
- TC (green): "You are viewing as TC. FC submitted [X] hours. Toggle below to use as your base. GC sees only your final price."
- FC (yellow): "You are viewing as FC. Enter hours and describe materials. Pricing is not visible to you."

**Tab 1 — Details**: CO info (description, team members, locations, created date, pricing type). Reuses existing `DetailRow` component data.

**Tab 2 — Pricing**: Role-specific. GC sees only TC final price + materials/equipment they're responsible for. TC sees FC cost basis + toggle + their pricing inputs. FC sees hours + description + materials description only (no pricing fields). Reuses existing `FCPricingToggleCard`, `FinRow`, and financial logic.

**Tab 3 — Line Items**: Table of all `co_line_items` with party indicators and visibility markers. Shows which party added each item. Reuses `COLineItemRow` in a condensed format.

**Tab 4 — Activity**: Chronological timeline with colored avatars (GC blue, TC green, FC amber), bold actor name, event description, status chips, timestamps, vertical connecting line. Reuses `COActivityFeed` data.

**Comment Bar**: Pinned to panel bottom. Avatar + text input ("Add a note or @mention a team member…") + send button. Comments stored in `co_activity` with action type `comment`. Visible to all parties.

## 4. Role Banners

- **GC** (blue `bg-blue-50 border-blue-200`): "You are viewing as GC. TC and FC pricing is hidden from your view. You see only the TC's final price."
- **TC** (green `bg-emerald-50 border-emerald-200`): "You are viewing as TC. FC submitted [X] hours. Toggle below to use as your base. GC sees only your final price." — X is `financials.fcTotalHours`.
- **FC** (yellow `bg-amber-50 border-amber-200`): "You are viewing as FC. Enter hours and describe materials. Pricing is not visible to you."

## 5. TC Pricing Toggle System

Two modes, mutually exclusive (only one toggle ON at a time, toggle OFF = manual entry):

**Hourly base mode** ("Use FC hours as my base"):
- Pre-fills labor hours from `financials.fcTotalHours`
- Calculation: FC hours × TC rate (from `org_settings.default_hourly_rate`) = price to GC
- Display: FC hours | Your rate | = Total

**Lump sum base mode** ("Use FC lump sum as my base"):
- Pre-fills from `financials.fcLumpSumTotal`
- Calculation: FC lump sum × (1 + `org_settings.labor_markup_percent` / 100) = price to GC
- Display: FC lump sum | Your markup % | = Total

**Manual mode** (both toggles OFF): TC enters hours and rate manually. No auto-calculation.

This maps directly to the existing `FCPricingToggleCard` and `use_fc_pricing_base` field. The current implementation has a single toggle — the panel will present it as the same single toggle with the mode determined by `co.pricing_type` (hourly for tm/nte, lump sum for fixed).

Live total displayed in a navy panel at bottom of Pricing tab, updates as fields change. Submit Pricing only active when total > 0.

## 6. Mobile Adaptation

Below 768px:
- Kanban collapses to a **vertical card list** (full-width cards with left-edge stripe). Same card design minus the board column context.
- Filter tabs scroll horizontally: All | My action | In progress | Approved
- Card tap opens a **full-screen bottom sheet** (not side panel). Header: back arrow + CO ID + title + status pill. Role banner. Tab row: Details | My Input (FC) or Pricing (TC) | Activity.
- FC mobile: hours, description, materials description fields + Save draft + Submit buttons.
- TC mobile: FC hours tile at top, toggle, labor/materials/equipment fields, live total in navy bar above submit.
- Bottom nav remains the project-level 5-icon bar from the icon rail spec.

## 7. CO Creation Flow

New CO button opens a centered modal (max 520px):
1. **Select CO type**: Scope Addition / T&M / Fixed Price / Material Sub / Design Change / Unit Price / Scope Deduction — each with icon + one-line description. Single select. Maps to `pricing_type` + `reason` combination.
2. **Basic info**: Title, Description, optional NTE amount
3. **Team**: Which TC (pre-filled from project participants), option to invite FC
4. **Confirm and create**

On creation: CO appears in column 1 (Work in Progress). TC gets notified. This replaces the existing 3-step wizard (Config → Scope → Review) with a simpler 4-step flow.

## 8. Who's Here Bar and Live Activity Text

**Who's Here**: Uses Supabase Realtime Presence. When a user opens a CO (via the slide-over panel), they join a presence channel `co:{coId}`. Their avatar appears in the Who's Here bar. Count label: "X people viewing this CO right now." Pulsing green dot indicates live connection.

**Live Activity Text**: Right-aligned text that updates when a user performs actions (entering pricing, adding line items, typing a comment). This is broadcast via the same presence channel as ephemeral state updates (e.g., `{ action: 'entering_pricing', role: 'TC' }`). Displays as "TC is entering pricing…" and clears after 5 seconds of inactivity.

On the page-level header (not the panel), live presence avatars show all users currently viewing *any* CO on this project — using a project-level presence channel `project-cos:{projectId}`.

## 9. Permission Rules Preserved

All existing CO permission rules are preserved:
- **GC never sees FC numbers**: GC view shows only `financials.tcBillableToGC` for labor. FC hours, FC lump sum, TC margin % are hidden.
- **FC never sees TC pricing**: FC sees only their own labor (`financials.fcLaborTotal`), no pricing fields for materials/equipment.
- **TC sees FC as cost basis**: TC sees `financials.fcLaborTotal` and `financials.fcTotalHours` as their cost input, but the final price to GC uses `tcBillableToGC`.
- Materials visibility: TC only sees materials/equipment if `materials_responsible === 'TC'` or `equipment_responsible === 'TC'`.
- Status action permissions: All existing `canShare`, `canSubmit`, `canApprove`, `canReject`, `canRecall`, `canMarkCompleted`, `canAcknowledge` logic from `COStatusActions` carries over unchanged.

## 10. Assumptions

1. **Drag-and-drop**: Will implement visual DnD using HTML5 drag events (no external library). Status transitions are validated against the existing status machine before executing.
2. **Left-edge stripe color mapping**: `pricing_type` is primary driver — `tm` = purple, `fixed` = green, `nte` = amber. `reason` overrides when present — `addition` = blue, `rework`/`design_change` = amber, `damaged_by_others` = red. The spec mentions "scope add = blue, T&M = purple, material sub = amber, unit price = green, deduction = red" — I'll map these from the combined `pricing_type` + `reason` fields.
3. **"Invoiced / Paid" column**: Currently maps to `contracted` status. The app doesn't have a `paid` status. I'll use `contracted` for this column.
4. **Comments**: Will store in `co_activity` table with `action: 'comment'` to keep everything in one timeline. No separate comments table needed.
5. **Auto-save**: Draft pricing inputs auto-save every 30s — will use a `setInterval` + debounce pattern writing to a localStorage draft, not to the database, to avoid partial saves.
6. **The existing `CODetailPage.tsx` full-page route** (`/projects/:projectId/change-orders/:coId`) will be removed in favor of the slide-over panel. Direct URL access to a CO will open the board page with that CO's panel auto-opened.
7. **Board/List toggle**: The spec says "Board / List view toggle" — List view reuses the existing card/list layout from the current `COListPage`.
8. **Stats row**: "Total CO value" sums `grandTotal` across all COs visible to user. "Pending my approval" counts COs in `submitted` where user's org can approve. "Awaiting pricing" counts COs in `closed_for_pricing`. "Approved & billable" counts `approved` COs.
9. **Presence channels require Realtime** to be enabled on relevant tables — will use Supabase Realtime Presence (channel-based, no table dependency).
10. **The existing wizard (`COWizard.tsx`)** will be replaced by the new 4-step creation modal. Existing wizard components (`StepCatalog`, `StepConfig`, `StepReview`) may be partially reused.
11. **Attention badges**: Will query actual counts from the database for each section indicator.

## Files Affected

### New Files
| File | Purpose |
|------|---------|
| `src/components/change-orders/COBoard.tsx` | Kanban board with 5 columns |
| `src/components/change-orders/COBoardCard.tsx` | Individual CO card for the board |
| `src/components/change-orders/COSlideOver.tsx` | Right slide-over panel wrapper |
| `src/components/change-orders/COSlideOverDetails.tsx` | Details tab content |
| `src/components/change-orders/COSlideOverPricing.tsx` | Pricing tab (role-aware) |
| `src/components/change-orders/COSlideOverLineItems.tsx` | Line items tab |
| `src/components/change-orders/COSlideOverActivity.tsx` | Activity timeline tab |
| `src/components/change-orders/COCreateModal.tsx` | New 4-step creation modal |
| `src/components/change-orders/COPresence.tsx` | Who's Here bar + presence logic |
| `src/components/change-orders/CORoleBanner.tsx` | Role-specific info banner |
| `src/hooks/useCOPresence.ts` | Realtime presence hook for CO viewing |

### Modified Files
| File | Change |
|------|--------|
| `src/components/change-orders/COListPage.tsx` | Replace flat list with board + list toggle; add filter pills, stats row, presence avatars |
| `src/components/change-orders/CODetailPage.tsx` | Remove as standalone page; extract reusable logic into slide-over components |
| `src/App.tsx` | Remove `/projects/:projectId/change-orders/:coId` route; redirect CO deep links to board with panel query param |
| `src/hooks/useChangeOrders.ts` | Add board-oriented grouping (by column) alongside existing grouped structure |

