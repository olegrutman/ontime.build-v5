
# FC ↔ TC parity for CO surfaces

Goal: an FC user's CO experience (list page, picker wizard, detail page) should look and behave the same as a TC user's, with **one structural exception**: FC has no downstream party, so anything that targets/assigns/requests-from a downstream FC is hidden for FC.

## What changes

### 1. CO List page (`COListPage.tsx`)
- Remove the early-return that swaps in `FCHomeScreen` for FC users.
- FC sees the same list UI as TC: header + "New CO" button, the active/all filter pills we just shipped, the same row layout and sort.
- `FCHomeScreen.tsx` stays in the codebase for now (not deleted) but is no longer rendered from the list page. We can prune it later if you confirm it isn't used elsewhere.

### 2. CO Picker — Step 1: Who/Where (`StepWho.tsx`)
- Remove the FC-only "↑ Routes To Your TC" info card.
- FC uses the same upstream selector pattern TC uses for GC: a "Routes To Your TC" card that lists the project's accepted TC orgs and lets FC pick one (auto-select the first if there's only one). This populates `assignedTcOrgId` so the routing chain renders the upstream leg correctly.
- The `RoutingChain` preview at the bottom already handles FC; no change there.

### 3. CO Picker — Step 3: Routing & Responsibilities (`StepPricingAndRouting.tsx`)
- FC sees the **same Pricing Model section** as TC (Fixed / T&M / NTE).
- FC sees the **same Materials & Equipment section** as TC, including the "Procured by" toggle with **TC / GC** options only (no FC self-procure option, per your answer).
- FC does **not** see the "Request FC hours" toggle, FC-org picker, or any downstream collaborator UI (this is the "one exception").
- Remove the standalone FC "auto-routing info" block in this step (the upstream relationship is already shown in Step 1 and in the routing chain).

### 4. Picker submit (`PickerShell.tsx`)
- For `role === 'FC'`: never insert into `change_order_collaborators`, never set `fc_input_needed = true`. The CO is created with FC as `org_id`, routed upstream to the selected TC as `assigned_to_org_id`. No downstream collaborator row.
- TC/GC behavior unchanged.

### 5. CO Detail page parity (`CODetailLayout.tsx`, `COSidebar.tsx`, related panels)
You confirmed: full parity minus downstream FC bits. Concretely:
- FC sees the same layout, header, KPI strip, scope items, pricing pane (matching the chosen pricing model), labor entries, materials panel, equipment panel, NTE panel (when applicable), profitability/markup card, activity feed, audit log, photos, evidence — exactly as TC sees them.
- Hidden for FC on the detail page:
  - `FCPricingToggleCard` (TC-only — it up-charges FC's hours; meaningless for FC).
  - Any "FC Input Requested" collaborator card / FC-assignment chip in the sidebar.
  - The "Request FC input" status action (FC has no downstream FC to request from).
- FC's financial pane mirrors TC's: own labor cost, own materials/equipment costs, markup, total submitted upstream to TC. (Not the "hide markup" alternative.)

### 6. Status actions (`COStatusActions.tsx`) — light audit
Walk the action list to confirm FC sees the TC-equivalent buttons (Submit upstream, Revise, etc.) and does not see TC-only delegation buttons (Request FC Input, Close For Pricing aimed at FC). No new actions added — this is only making sure the existing buttons are gated by capability rather than by `isTC`-vs-`isFC` where the capability is actually shared.

## Out of scope
- No DB schema changes. No RLS changes.
- No changes to GC's CO experience.
- No changes to invoicing, contracts, or upstream billing logic.
- No deletion of `FCHomeScreen.tsx` (kept for now; can be removed in a follow-up).
- No changes to the "active vs all" filter behavior we just shipped.

## Files expected to change
- `src/components/change-orders/COListPage.tsx`
- `src/components/change-orders/picker-v3/StepWho.tsx`
- `src/components/change-orders/picker-v3/StepPricingAndRouting.tsx`
- `src/components/change-orders/picker-v3/PickerShell.tsx`
- `src/components/change-orders/CODetailLayout.tsx`
- `src/components/change-orders/COSidebar.tsx`
- `src/components/change-orders/COStatusActions.tsx` (gating audit only)

## Acceptance check
Logged in as an FC user on a project:
1. `/project/:id/change-orders` shows the same list UI as TC, with the active/all filter.
2. Clicking "New CO" runs the same 4-step picker as TC; Step 1 lets FC pick the upstream TC; Step 3 has pricing + materials/equipment but no "Request FC hours" block.
3. After creating, the CO opens with the same detail layout as TC — pricing pane, labor, materials, equipment, markup, totals, activity, audit — but no FC-collaborator card and no FC-pricing-toggle card.
