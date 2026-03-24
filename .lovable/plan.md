

# CO Redesign: Field-First Creation and Job Ticket Detail

## Explain Back

### 1. Complete 4-tap FC flow: Home Screen to Job Ticket

Tap 1: FC taps "Something happened" on the hero action grid (FCHomeScreen). This opens the QuickLogWizard at Screen 1.

Tap 2: On Screen 1 (What happened?), the FC optionally records a voice note or types a description, then taps one of 4 reason cards (Extra scope / Plan changed / Found damage / Redo work). Tapping "Saw damage" from home pre-selects "Found damage". They tap "Next — where is it?"

Tap 3: On Screen 2 (Where?), if a saved location exists, a banner shows "Same as last time? Inside · Level 2 · Unit interior — Use it". Tap Yes and skip to Screen 3. Otherwise: tap Inside or Outside, then tap a level pill and area card (2 taps inside) or an elevation card (1 tap outside). Tap "Next — what work?"

Tap 4: On Screen 3 (What work?), the FC taps one or more common scope items from a 2x2 grid sourced from `project_scope_selections` where `is_on = true`. Taps "Create CO". The CO is written as draft with `pricing_type = 'fixed'`, `created_by_role = 'FC'`, line items inserted, activity logged, location saved to localStorage. Navigates immediately to the COJobTicket with a success banner.

Total: 4 interactions (reason card + location shortcut + work item + create).

### 2. VisualLocationPicker for a 3-story residential project

**Inside path:** User taps "Inside" card (large tap target with Home icon). A horizontal pill strip appears: `Ground` `Level 2` `Level 3` (derived from `stories = 3` in project profile via `getLevelOptions`). User taps `Level 2`. Below, a 2x2 grid appears: `Unit interior` / `Corridor` / `Stairwell` / `Other` (residential type). User taps `Unit interior`. A navy pill preview at bottom reads: "Inside · Level 2 · Unit interior". Total taps: 2.

**Outside path:** User taps "Outside" card. A 2x2+ grid appears. For residential multifamily: `South elevation` / `North elevation` / `East elevation` / `West elevation` + `Roof` / `Other`. For single family: `Front` / `Rear` / `Left side` / `Right side` + `Roof` / `Other`. User taps one. Navy pill preview: "Outside · South elevation". Total taps: 1.

No building selector. No dropdowns anywhere. Level is always a pill strip. Area and elevation are always visual grids.

### 3. Same-as-last shortcut

**Storage:** `localStorage` key `{userId}_{projectId}_last_location` stores the assembled location tag string (e.g., "Inside · Level 2 · Unit interior").

**Banner:** At the top of Screen 2 (QuickLogWizard) and at the top of any location edit in COJobTicket, if a saved value exists: an amber-accented banner appears. Text: "Same as last time? Inside · Level 2 · Unit interior — Use it" with a single amber tap target.

**On tap:** Sets the location tag immediately, skips the rest of Screen 2, advances to Screen 3 (or closes the location edit in the job ticket).

**Updates:** After every CO creation or hour entry that includes a location confirmation, the localStorage value is overwritten with the new tag.

### 4. COJobTicket sections by role

**Section 1 — What's the job** (collapsed by default)
- All roles: scope items list, reason badge, description text, photo thumbnails (when photo support exists — see assumptions)
- FC sees who created it
- GC/TC see the same

**Section 2 — Hours**
- **FC view:** Label "My hours". Expanded: InlineHourEntry component embedded directly. Quick-select pills (2h/4h/8h/+), date picker, optional description. Preview bar shows hours only — no rate, no dollar amount. Ever.
- **TC view:** Label "Labor & pricing". Expanded: FC submitted hours as cost basis (if FC collaborator exists), TC rate calc from `org_settings.default_hourly_rate`, materials total, grand total preview.
- **GC view:** Label "Cost breakdown". Expanded: TC submitted labor total, materials total, equipment total, grand total. No margins or sub-costs visible.

**Section 3 — Materials**
- FC: item names and quantities only. No pricing fields.
- TC: full materials table with unit cost, markup, total.
- GC: TC's materials total only.

**Section 4 — Activity**
- All roles: chronological timeline with colored avatars (GC blue, TC green, FC amber). Bold actor + event + timestamp. Comment input pinned at bottom of expanded section.

### 5. Sticky action button — one label per state

1. FC, draft, no hours: **"Submit this CO to TC"** (navy)
2. FC, hours drafted: **"Submit 8 hrs to TC"** (green)
3. FC, hours submitted: **"Waiting on TC pricing"** (gray, disabled)
4. TC, waiting for FC: **"Request hours from Acme Electric"** (navy outline)
5. TC, FC hours submitted: **"Price this CO"** (amber)
6. TC, pricing entered: **"Submit $4,250.00 to GC"** (navy)
7. TC, pricing submitted: **"Waiting on GC approval"** (gray, disabled)
8. GC, submitted: **"Review and approve"** (amber)
9. GC, approved: **"Acknowledged ✓"** (green, disabled)

### 6. GCApprovalCard

**Trigger:** CO status is `submitted` AND viewer is GC. Renders at the top of the job ticket, above all accordion sections.

**Shows:** CO number + title + type badge + "Submitted 2 hours ago" label. Photo strip (placeholder if none). Location tag, work type (scope items), contractor name (TC). Divider. Labor $, Materials $ (if exists), Equipment $ (if exists). Divider. Large total in Barlow Condensed. Two buttons: "Reject with note" (outline, red) and "Approve $4,250.00" (green fill). Below: "Next pending: CO-005 · $1,800 →" link to next submitted CO.

**Approve:** Calls `approveCO.mutateAsync()`, sets status to `approved`, logs activity, updates card to "Acknowledged".

**Reject:** Opens bottom sheet with required text field. On confirm: calls `rejectCO.mutateAsync(note)`, sets status to `rejected` with rejection_note, navigates back or to next pending.

### 7. COContextualAlert — 3 examples

1. FC, hours not yet submitted, TC waiting: Yellow bar — **"Martinez Drywall is waiting on your hours to price this CO"**
2. TC, FC submitted hours: Green bar — **"Acme Electric submitted 12 hrs — use as your pricing base?"** + inline "Yes" button
3. GC, submitted for approval: Amber bar — **"Martinez Drywall submitted for approval 3 hours ago"**

Replaces `CORoleBanner` everywhere. No bar shown when no action is needed.

### 8. Four desktop panel changes

1. **COContextualAlert** replaces `CORoleBanner` in the `COSlideOver` header area
2. **VisualLocationPicker** replaces the dropdown-based location fields in the Details tab
3. **Status actions** move from a full card shell to compact inline buttons (h-8, text-xs) in the panel header row, beside status pill and close button. Full `COStatusActions` card moves inside the Details tab.
4. **refreshDetail** already fixed to call `queryClient.invalidateQueries` — confirmed working.

Everything else in COSlideOver stays the same: tabs (details, pricing, line items, activity), comment bar, NTE panel, FC pricing toggle, materials/equipment panels, overlay behavior, Who's Here bar.

### 9. No dropdowns anywhere in VisualLocationPicker

Confirmed. Level is always a horizontal scrollable pill strip. Area is always a 2x2 visual grid of large tap targets. Elevation is always a 2x2+ visual grid. Text input appears only when "Other" is explicitly tapped. The `<Select>` component is never used inside `VisualLocationPicker`.

### 10. Assumptions

1. **No photo storage table exists.** `co_photos` or `co_attachments` tables don't exist in the schema. I will create a storage bucket and a `co_attachments` table for photo uploads. Until that migration runs, photo features will show "No photos" placeholder.
2. **Web Speech API** for voice notes uses the browser's built-in `SpeechRecognition` / `webkitSpeechRecognition`. No external API key needed. Falls back gracefully on unsupported browsers (hides the mic button).
3. **Project type resolution** for area/elevation options: I'll query `project_types` via `project_profiles.project_type_id` to get `is_multifamily`, `is_single_family`, `is_commercial` flags. These drive which area grid and elevation grid options appear.
4. **"Log my hours" and "Need material" hero buttons** on FCHomeScreen will navigate to existing CO list filtered to actionable COs. Full dedicated flows for these are out of scope for this change.
5. **Custom level names:** The current `project_profiles` schema doesn't have a `custom_level_names` field. I'll use the existing `getLevelOptions()` logic which generates "Floor 1", "Floor 2" etc. from `stories` count, plus Basement/Attic/Mezzanine from profile flags. If custom names are needed later, it's a schema addition.
6. **COJobTicket is mobile-only.** Desktop continues to use COSlideOver. The route `/projects/:projectId/change-orders/:coId` renders COJobTicket on mobile and redirects to the CO list with the slide-over open on desktop.
7. **"Next pending" link** in GCApprovalCard queries the change orders list for the next CO with `status = 'submitted'` after the current one.
8. **FC home screen** replaces the overview tab content when `isFC` is true on ProjectHome. GC and TC overview tabs are unchanged.
9. The existing `COWizard` (3-step config/catalog/review) remains available for GC and TC roles. Only FC gets the QuickLogWizard.

---

## Implementation Plan

### Phase 1 — Foundation Components

**A. VisualLocationPicker** (`src/components/change-orders/VisualLocationPicker.tsx`)
- Props: `projectId`, `onConfirm(tag: string)`, `savedLocation?: string`, `compact?: boolean` (for desktop inline)
- Fetches project profile + project type internally
- Inside path: pill strip for levels, 2x2 grid for area (residential vs commercial options)
- Outside path: 2x2+ grid for elevation (multifamily vs single family options)
- Shortcut banner at top when `savedLocation` is set
- Live preview pill at bottom
- Zero dropdowns

**B. COContextualAlert** (`src/components/change-orders/COContextualAlert.tsx`)
- Props: `co`, `role`, `isGC`, `isTC`, `isFC`, `fcCollabName`, `tcName`, `financials`
- Returns null when no action needed
- Returns colored alert bar with role-specific message

**C. InlineHourEntry** (`src/components/change-orders/InlineHourEntry.tsx`)
- Props: `coId`, `lineItemId`, `orgId`, `role`, `pricingType`, `nteCap`, `nteUsed`, `onSaved`
- Large Barlow Condensed number display
- Quick-select pills: 2h / 4h / 8h / + (custom)
- Date row with native picker
- FC mode: no rate, no dollar total shown
- TC mode: rate field, calculated total shown
- Reuses save logic from LaborEntryForm

### Phase 2 — Quick Log Wizard

**QuickLogWizard** (`src/components/change-orders/wizard/QuickLogWizard.tsx`)
- 3 screens in a full-screen sheet (mobile) or dialog (desktop)
- Screen 1: Voice button (Web Speech API), photo upload, description textarea, 4 reason cards (2x2)
- Screen 2: VisualLocationPicker with shortcut banner
- Screen 3: Scope item grid from `project_scope_selections` where `is_on = true`, search bar, multi-select
- On create: writes CO record, line items, activity, saves location to localStorage, navigates to job ticket

### Phase 3 — FC Home Screen

**FCHomeScreen** (`src/components/change-orders/FCHomeScreen.tsx`)
- Hero action block: 2x2 grid with amber "Something happened", "Log my hours", "Need material", "Saw damage"
- Below: "Open COs requiring your input" — queries COs where FC is active collaborator and status in actionable states
- Rendered in ProjectHome when `isFC && activeTab === 'change-orders'`

### Phase 4 — CO Job Ticket (Mobile Detail)

**COJobTicket** (`src/components/change-orders/COJobTicket.tsx`)
- Header: back arrow, CO number, title, location tag, status pill
- COContextualAlert below header
- GCApprovalCard at top when applicable
- 4 collapsible accordion sections using Radix Collapsible
- Sticky primary action button at bottom
- Role-aware content per section

**GCApprovalCard** (`src/components/change-orders/GCApprovalCard.tsx`)
- Self-contained review card
- Photo strip, financial breakdown, approve/reject buttons
- "Next pending" link

### Phase 5 — Integration

- **COListPage.tsx**: FC role renders FCHomeScreen instead of the standard list
- **Route `/projects/:projectId/change-orders/:coId`**: On mobile, render COJobTicket. On desktop, redirect to CO list with `?co=coId` to open slide-over.
- **COSlideOver.tsx**: Replace CORoleBanner with COContextualAlert. Replace location dropdowns in Details tab with VisualLocationPicker. Move status actions to compact header buttons.
- **StepCatalog.tsx**: Replace dropdown-based location picker with VisualLocationPicker (for GC/TC wizard)

### Phase 6 — Storage Migration

- Create `co_attachments` table: `id, co_id, file_path, file_name, mime_type, uploaded_by_user_id, created_at`
- Create `co-attachments` storage bucket (public read)
- RLS: authenticated users can insert/select on their org's COs

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/change-orders/VisualLocationPicker.tsx` | Reusable no-dropdown location picker |
| `src/components/change-orders/COContextualAlert.tsx` | Role-aware single-line alert bar |
| `src/components/change-orders/InlineHourEntry.tsx` | Embedded hour entry for job ticket |
| `src/components/change-orders/wizard/QuickLogWizard.tsx` | 3-screen FC CO creation flow |
| `src/components/change-orders/FCHomeScreen.tsx` | FC home with action hero + open COs |
| `src/components/change-orders/COJobTicket.tsx` | Mobile job ticket detail view |
| `src/components/change-orders/GCApprovalCard.tsx` | GC approval review card |

### Files to Modify
| File | Change |
|------|---------|
| `src/components/change-orders/COSlideOver.tsx` | Replace CORoleBanner with COContextualAlert, inline status buttons, VisualLocationPicker in Details tab |
| `src/components/change-orders/COListPage.tsx` | Render FCHomeScreen for FC role |
| `src/components/change-orders/wizard/StepCatalog.tsx` | Replace dropdown location picker with VisualLocationPicker |
| `src/pages/ProjectHome.tsx` | No change needed — COListPage handles FC routing internally |
| `src/pages/CODetail.tsx` | Mobile: render COJobTicket. Desktop: redirect to list with slide-over |
| `src/types/location.ts` | Add residential/commercial area option sets |

