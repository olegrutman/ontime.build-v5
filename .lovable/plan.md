

# Full App Bug Report

Here is a plain-English summary of every bug and issue I found across the app:

---

## Bug 1: "handleMarkPartOfTeam" does the same thing as "handleMarkSoleMember" (Dashboard.tsx, lines 199-210)

Both the "I'm the sole member" and "I'm part of a team" buttons run identical code — they both set `ontime_sole_member` to true and mark `soleMember = true`. The "Part of Team" handler should NOT mark the user as a sole member. This means the onboarding checklist "team" step is always satisfied regardless of which button the user clicks, which defeats its purpose.

---

## Bug 2: React ref warning on ProjectRow (Console error)

The console shows: **"Function components cannot be given refs"** for `ProjectRow`. This happens because `DashboardProjectList` renders `<ProjectRow>` and somewhere (likely the `DropdownMenuTrigger`) is trying to pass a ref to it. `ProjectRow` is a plain function component that doesn't use `React.forwardRef`. This is a non-breaking warning but clutters the console and could cause issues with dropdown positioning.

---

## Bug 3: WorkOrderWizard `canGoNext()` is misaligned with the 8-step STEPS array

The wizard has 8 steps (title, location, worktype, scope, pricing, resources, assignment, review), but the `canGoNext()` switch statement only handles cases 1-6 and falls through to `default: return true` for steps 7 and 8. More critically, the case numbers don't match the actual steps:
- Case 4 says "Resources" but step 4 is actually "Scope Details"
- Case 5 says "Assignment" but step 5 is actually "Pricing Mode"
- Case 6 says "Review" but step 6 is actually "Resources"

This means the **Location step (case 2) validation works**, but the **Work Type step (case 3) validation also works**, but **Pricing Mode (step 5) has no validation** when it probably should, and overall the comments are wrong which will confuse future development.

---

## Bug 4: InvoicesTab summary cards are missing `data-sasha-card`

The `InvoicesTab` component contains summary `<Card>` elements (invoice counts, totals, etc.) that were not tagged with `data-sasha-card`. So Sasha's "Explain This Card" mode won't detect them on the Invoices tab. The `InvoiceCard` itself was tagged, but the summary/stats cards at the top of the invoices tab were not.

---

## Bug 5: WorkItemPage sections missing `data-sasha-card`

The plan included tagging `WorkItemPage.tsx` sections with `data-sasha-card="Work Item"` and `"Work Item Details"`, but this was never implemented. Sasha highlight mode won't detect anything on the work item detail page (except the T&M Period cards which were tagged).

---

## Bug 6: Sasha highlight overlay uses a hardcoded SVG mask ID

In `SashaHighlightOverlay.tsx`, the SVG mask uses `id="sasha-highlight-mask"`. If multiple overlays were ever mounted (unlikely but possible with React strict mode or fast toggling), you'd get duplicate IDs and broken masking. Minor but worth noting.

---

## Bug 7: SashaBubble is rendered on ALL routes including Landing, Auth, and Signup

In `App.tsx` line 200, `<SashaBubble />` is rendered inside `AppRoutes` which wraps all routes. This means the Sasha chat bubble appears on the landing page, login page, signup page, and password reset page — where it has no useful context and looks out of place. It should only render on authenticated routes.

---

## Bug 8: No Escape key handler for Sasha highlight mode

When the user activates Sasha's "Explain This Card" highlight mode, there's no keyboard shortcut (like Escape) to exit it. The only way out is to click on empty space (which triggers `onCancel`). This is a UX gap for keyboard users.

---

## Summary of severity:

| # | Bug | Severity |
|---|-----|----------|
| 1 | handleMarkPartOfTeam duplicate logic | **Medium** — onboarding checklist is misleading |
| 2 | ProjectRow ref warning | **Low** — console noise, no user impact |
| 3 | WorkOrderWizard canGoNext misalignment | **Medium** — wrong validation on wrong steps |
| 4 | InvoicesTab summary cards not tagged | **Low** — Sasha feature gap |
| 5 | WorkItemPage not tagged | **Low** — Sasha feature gap |
| 6 | Hardcoded SVG mask ID | **Very Low** — edge case |
| 7 | SashaBubble on unauthenticated pages | **Low** — UX polish |
| 8 | No Escape key for highlight mode | **Low** — UX/accessibility gap |

---

## Recommended fix order:
1. Fix Bug 1 (handleMarkPartOfTeam) — quick one-line logic fix
2. Fix Bug 3 (WorkOrderWizard canGoNext) — realign case numbers with actual steps
3. Fix Bug 2 (ProjectRow forwardRef) — wrap component with `React.forwardRef`
4. Fix Bug 7 (SashaBubble scope) — conditionally render only when authenticated
5. Fix Bug 8 (Escape key) — add keydown listener in overlay
6. Fix Bugs 4 & 5 (missing data-sasha-card tags) — add attributes

All fixes are straightforward, single-file changes. Want me to fix all of them?

