
# CO/WO Picker v3 + Role-Aware Overview Page

Two new artifacts replacing both the current `COWizard.tsx` dialog and augmenting `CODetailLayout.tsx`.

---

## What I Learned from the Three Prototypes

**Picker v2** (first upload): Full 8-step wizard with navy summary sidebar, multi-item support, narrative builder, approval chain. Established the split-panel pattern.

**Picker v3** (second upload): Refined version with key additions:
- **Step 3 "Who"** — role-dependent collaboration setup (GC assigns TC + optional FC; TC optionally requests FC; FC auto-routes to TC)
- **Step 7 "Materials & Equipment"** — tabbed panel with responsibility toggles (GC/TC), catalog modal picker, staged-for-PO pattern (no inline PO creation)
- **Right aside** changed from navy summary to white card-based item list + navy total panel at bottom
- **Role switcher** in topbar for demo/review
- **Routing chain** preview (navy strip showing approval flow)
- 9 steps: Where → Why → **Who** → Pricing → Work → Scope → **Materials & Equipment** → Total → Review

**Overview page** (third upload): Role-aware detail page with:
- **Status pipeline** (Created → Pricing → Review → Submitted → Approved) with progress line
- **Next Action Banner** — completely different per role (GC: Approve/Reject, TC: Waiting/Recall, FC: Hours submitted)
- **KPI strip** — 4 cards that swap entirely by role (GC: TC Submitted/Material/Equipment/Budget; TC: FC Cost/My Billable/Mat+Equip/Total to GC; FC: Hours/Billed to TC/Internal Cost/Margin)
- **2-column layout**: left (scope items + materials/equipment table) + right rail (financials, FC pricing toggle, team, approval chain, activity)
- **Role-aware visibility** via `data-active-role` attribute and CSS rules
- **Financials panel** shows different breakdowns per role (TC sees internal/private cost + margin; FC sees wage cost + margin; GC sees only submitted totals)
- **FC pricing base toggle** — TC-only card showing hours × rate = billable
- **Collaboration panel** — team list with status badges (Active, Invited, Done)
- **Linked PO banner** on materials table

---

## Artifact 1: CO/WO Picker v3

### Layout
- Full-page split: left main area (topbar + stepper + content), right aside (item list + total panel + nav buttons)
- Aside is sticky 340px on desktop, slides in as drawer on mobile (< 920px)
- Role switcher in topbar for demo purposes

### Step Flow (9 steps from v3 prototype)

| # | Key | Content |
|---|-----|---------|
| 1 | Where | Location picker (building + system) with multi-location toggle. Reuse `VisualLocationPicker` data. |
| 2 | Why | Grouped cause cards (conflict / site issue / add-on). Infers CO vs WO, billable, backcharge. |
| 3 | Who | **Role-dependent**: GC picks TC + optional FC; TC sees auto-assigned GC + optional FC; FC sees auto-routing. Routing chain preview. |
| 4 | Pricing | Fixed / T&M / NTE card selector. |
| 5 | Work | Multi-select pills with ★ suggested items based on cause + system. |
| 6 | Scope | AI-generated narrative with tone toggle (clinical/plain), voice note + photo attach. |
| 7 | Materials & Equipment | Tabbed panel. Responsibility toggles (GC/TC). Catalog modal. "Staged for PO" badge. |
| 8 | Total | Per-item pricing summary with markup %. "Add Another Item" or "Go to Review" fork. |
| 9 | Review | Multi-item roll-up table, approval chain, submit. |

### What Stays from Prototypes
- Split-panel layout with aside item list
- Pick card grid for location/cause
- Pill-based work type multi-select with ★ suggestions
- Inference badges (CO/WO, billable, backcharge)
- Pricing card trio
- Narrative builder with tone toggle + regenerate shimmer
- Multi-item support (add another, each inherits cause/pricing)
- Responsibility toggles on materials/equipment
- Catalog modal for adding materials
- Routing chain preview (navy strip)
- Stepper with done/active/future states
- Item context strip when editing item 2+
- Total panel with breakdown rows
- All typography: Barlow Condensed headings, IBM Plex Mono financials, DM Sans body
- Amber accent throughout

### What Changes vs Current Code
- **Replaces** `COWizard.tsx` (1558-line dialog) entirely
- Full page route instead of dialog/sheet
- State via `useReducer` with multi-item array
- Adds Step 3 (Who) — collaboration setup
- Adds Step 7 (Materials & Equipment) with responsibility toggles
- Materials stage on CO, PO creation deferred to overview page
- FC collaborator row created on submit (status: 'invited')

### Technical Details
- New route: `/projects/:id/co/new` (and `/wo/new`)
- Components in `src/components/change-orders/picker-v3/`:
  - `PickerShell.tsx` — grid layout + responsive aside drawer
  - `PickerStepper.tsx` — 9-step bar
  - `PickerAside.tsx` — item list + total panel + nav buttons
  - `StepWhere.tsx`, `StepWhy.tsx`, `StepWho.tsx`, `StepPricing.tsx`, `StepWork.tsx`, `StepScope.tsx`, `StepMaterialsEquipment.tsx`, `StepTotal.tsx`, `StepReview.tsx`
  - `CatalogModal.tsx` — material/equipment catalog picker
  - `RoutingChain.tsx` — navy approval flow preview
  - `usePickerState.ts` — reducer managing items[], currentIndex, step
  - `types.ts` — PickerItem, PickerState
- Reuses: `useScopeCatalog`, `useProjectFCOrgs`, `useCORoleContext`, `generateCONumber`
- On submit: single transaction creating `change_orders` + `co_line_items` + `co_materials` + `co_equipment` + `change_order_collaborators`

---

## Artifact 2: CO/WO Overview Page

### Layout
- Topbar with breadcrumb + role switcher
- Header card: CO number + status pill + pricing pill + title + pipeline visualization
- Next Action Banner (navy, role-dependent)
- KPI strip (4 cards, role-aware)
- 2-column grid: left (scope items + materials/equipment) + right rail (financials + FC pricing toggle + team + approval chain + activity)

### Role-Aware Rendering

**GC sees:**
- Next Action: "Review & approve $X" with Approve/Reject buttons
- KPIs: TC Submitted | Material Cost | Equipment | Budget Impact
- Financials: TC Labor + Materials + Equipment = Total to Approve + budget usage bar
- Materials table with linked PO banner, "Send for Pricing" action
- No internal cost or markup visibility

**TC sees:**
- Next Action: "Waiting on GC" with Recall button
- KPIs: FC Cost | My Billable | Mat + Equip | Total to GC
- Financials: Billable section + Internal/Private section (FC cost, material cost, equip cost) + margin block with progress bar
- FC Pricing Base toggle card (hours × rate = billable)
- Materials table with full pricing columns

**FC sees:**
- Next Action: "Your hours are with [TC]" with Add Hours button
- KPIs: Hours Logged | Billed to TC | Internal Cost | Margin
- Financials: Hour breakdown by role + Billed to TC total + Internal wage cost + margin
- Materials table without cost columns (hidden via role CSS)
- No PO actions visible

### What Stays from Current `CODetailLayout`
All existing sub-components are preserved and reused where they fit:
- `CONextActionBanner` — enhanced with role-specific content from prototype
- `COKPIStrip` — enhanced with full role-conditional metrics
- `COLineItemRow`, `COMaterialsPanel`, `COEquipmentPanel`
- `COActivityFeed`, `COAcceptBanner`, `COStatusActions`
- `FCPricingToggleCard`, `FCInputRequestCard`
- `useCORoleContext`, `useCOResponsibility`, `useCORealtime`

### What's New
- **Status pipeline** in header card (5-step progress with line fill)
- **Role switcher** matching dashboard tab pattern
- **Financials panel** with role-conditional breakdown + margin block
- **Team/Collaboration panel** with status badges (Active/Invited/Done)
- **Linked PO banner** on materials panel
- **Approval chain** as vertical timeline with pulse animation on active step

### Files Modified
- `CODetailLayout.tsx` — restructured to 2-column grid layout with role switcher
- `COHeaderStrip.tsx` — add pipeline visualization
- `COKPIStrip.tsx` — complete role-conditional content

### New Components
- `COPipelineStatus.tsx` — the 5-step progress line
- `COFinancialsPanel.tsx` — role-aware financial breakdown with margin block
- `COTeamPanel.tsx` — collaborator list with status badges
- `COApprovalTimeline.tsx` — vertical approval chain
- `CORoleSwitcher.tsx` — reusable GC/TC/FC tab switcher

---

## Design Decisions Confirmed

1. **Two artifacts** — picker creates, overview manages. Different layouts, different mental modes.
2. **Role switcher** follows dashboard tab pattern (not dev-only).
3. **Materials stage, not inline PO** — picker stages materials on the CO. PO creation from overview's COMaterialsPanel.
4. **FC invitation on CO submit** — collaborator row with status 'invited'. FC sees Accept Banner.
5. **Aside is white cards, not navy** — v3 moved from navy sidebar to white aside with navy total panel at bottom.

---

## Implementation Order

1. Picker v3 shell (layout, stepper, aside, reducer)
2. Steps 1-2 (Where + Why)
3. Step 3 (Who — role-dependent collaboration)
4. Steps 4-5 (Pricing + Work types)
5. Step 6 (Scope narrative with AI integration)
6. Step 7 (Materials & Equipment with catalog modal)
7. Steps 8-9 (Total + Review + submit transaction)
8. Overview: pipeline status + role switcher
9. Overview: KPI strip + financials panel (role-aware)
10. Overview: team panel + approval timeline
