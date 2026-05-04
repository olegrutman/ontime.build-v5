
# CO Flow Audit: What's Broken & How to Fix It

## Current State — 3 Competing Entry Points

Right now there are **three different ways** to create/populate a Change Order, and they don't agree on flow or state management:

### Path A: "New Detail" (COListPage → CONewDetail → CODetailLayout)
- **Route:** `/project/:id/change-orders/new-detail`
- **What happens:** `CONewDetail.tsx` auto-creates a blank `draft` CO in the DB, then redirects to the standard detail page (`CODetailLayout`).
- **Problem:** The user lands on a **detail/editing page** with empty fields. They're expected to fill in location, reason, scope, pricing inline — basically a big form. The `COCreationChecklist` banner offers a "Use guided wizard" link that navigates to Path B (`/new`), but that wizard creates a *separate* CO record, not editing the one they're already on.

### Path B: Picker v3 Wizard (COListPage → PickerShell)
- **Route:** `/project/:id/change-orders/new`
- **What happens:** The Picker v3 (`PickerShell.tsx`) runs a 4-step guided wizard (Where & Why → Scope → Pricing & Routing → Review). On submit, it creates a new CO in the DB and navigates to the detail page.
- **Problem:** This is the **new, intended flow**, but it's not the default entry point from the list page. The list page's "+" button goes to Path A (`new-detail`), not here.

### Path C: "Add Items" to existing CO (CODetailLayout → PickerShell)
- **Route:** `/project/:id/change-orders/:coId/add-items`
- **What happens:** Opens Picker v3 in "add mode" against an existing CO.
- **This one is fine** — it correctly augments an existing draft.

### Path D: Quick Capture (dead end)
- **Route:** `/project/:projectId/change-orders/quick`
- **Problem:** Separate `QuickCaptureFlow` component — likely outdated and disconnected from the v3 flow.

## The Core Problems

1. **Wrong default entry:** The "+" button in `COListPage` goes to `new-detail` (Path A), which dumps the user on a blank detail page with no guidance. It should go to the Picker v3 wizard (Path B).

2. **Checklist wizard link creates duplicates:** Inside `COCreationChecklist` (shown on the detail page), "Use guided wizard" navigates to `/new` which creates a *brand new* CO instead of populating the current one. This is confusing and creates orphan drafts.

3. **Two state management systems:** The Picker v3 uses a local reducer (`usePickerState`), while `CODetailLayout` uses `useChangeOrderDetail` hook against the DB. They don't share state. When you finish the wizard, the detail page has to re-fetch everything.

4. **Old wizard folder still exists:** `src/components/change-orders/wizard/` contains `StepCatalog`, `StepCatalogQA`, `SharedWizardComponents`, etc. These are the **old** catalog/scope selection components. They are NOT used by the detail page or Picker v3, but they still exist and create confusion.

5. **`CONewDetail.tsx` is redundant:** Its only job is to auto-create a draft CO and redirect. If Picker v3 is the entry point, this page serves no purpose.

## What's New (Keep)
- `picker-v3/*` — the 4-step guided wizard (PickerShell, StepWhereAndWhy, StepScopeCombined, StepPricingAndRouting, StepReview)
- `CODetailLayout` — the post-creation detail/editing view (keep, but stop using it as a creation flow)
- All the detail sub-components (COKPIStrip, COSidebar, COStatusActions, etc.)

## What's Old (Remove or Archive)
- `CONewDetail.tsx` — the auto-create-and-redirect page
- `src/components/change-orders/wizard/*` — the old catalog step components (unused)
- `COCreationChecklist.tsx` — the inline checklist with the broken wizard link
- The `/quick` QuickCapture route for COs (if superseded by Picker v3)

## Proposed Unified Flow

```text
COListPage [+] button
       │
       ▼
  Picker v3 Wizard (/project/:id/change-orders/new)
  Step 1: Where & Why
  Step 2: Scope (work types, narrative)
  Step 3: Pricing & Routing (pricing type, TC/FC assignment)
  Step 4: Review → Submit creates CO in DB
       │
       ▼
  CODetailLayout (/project/:id/change-orders/:coId)
  - View/edit the created CO
  - "Add Items" button → Picker v3 in add-mode (:coId/add-items)
  - No more creation checklist — CO is already populated
```

## Implementation Steps

1. **Reroute the "+" button** in `COListPage` from `new-detail` to `new` (one line change).
2. **Delete or archive `CONewDetail.tsx`** and remove its route from `App.tsx`.
3. **Remove `COCreationChecklist`** from `CODetailLayout` (it only shows for drafts with empty fields — which won't happen if Picker v3 is the entry).
4. **Archive `src/components/change-orders/wizard/`** — move to `_archived/`.
5. **Remove the `/quick` CO route** if QuickCapture is fully replaced by Picker v3.
6. **Clean up unused imports** across affected files.

This is primarily a routing and cleanup change — no new UI components needed, no DB changes. The Picker v3 wizard is already built and working; it just needs to be the **only** entry point.
