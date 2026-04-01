

# Fix: 7 Issues — Overview Priority, FC/GC Contracts, PO Wizard, System Supplier, Sasha Context

## Issues Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | Attention items should show above budget on overview | UX |
| 2 | FC can see contract price on dashboard but not in project overview | BUG |
| 3 | GC can't enter their contract price with the owner | MISSING FEATURE |
| 4 | FC can't enter their budget numbers | BUG |
| 5 | PO wizard first page flashes on open | UX BUG |
| 6 | PO with system supplier sends to nowhere — need email prompt | BUG |
| 7 | Teach Sasha every page | MISSING CONTEXT |

---

## Bug Details & Fixes

### 1. Move Attention Banner above budget on overview
**Root cause**: `AttentionBanner` is rendered with `lg:hidden` (mobile only, line 341) in `ProjectHome.tsx`, and is NOT included inside `ProjectOverviewV2.tsx` at all for desktop.

**Fix** (`ProjectHome.tsx`):
- Remove the `lg:hidden` wrapper around `AttentionBanner`
- Move it above `ProjectOverviewV2` so attention items always appear first on both mobile and desktop

### 2. FC can't see contract price in project overview
**Root cause**: `OverviewContractsSection.tsx` line 16-28 — when `viewerRole === 'Field Crew'`, it reads `upstreamContract` which is the GC↔TC contract. FC's contract (TC↔FC) is stored as `downstreamContract` in `useProjectFinancials`.

**Fix** (`OverviewContractsSection.tsx`):
- For FC, use `downstreamContract` instead of `upstreamContract`
- The KPI tiles in `ProjectOverviewV2` already use `primaryContract` (which correctly resolves to `downstreamContract` for FC), so they're fine

### 3. GC can't enter owner contract price
**Root cause**: `updateOwnerContract` exists in `useProjectFinancials` but is never called from any UI component. There's no editor for GC to set their contract value with the property owner.

**Fix** (`OverviewProfitCard.tsx`):
- Add an inline editor (pencil icon → input field) for the "Owner Contract" value, similar to how `BudgetTracking` handles labor budget editing
- Only show for GC role
- Call `financials.updateOwnerContract(upstreamContract.id, value)` on save

### 4. FC can't enter budget numbers
**Root cause**: `BudgetTracking.tsx` line 22 — `showLabor = viewerRole === 'Field Crew' || (TC && selfPerforming)`. This should work. But line 27: `budgetContract = viewerRole === 'Field Crew' ? downstreamContract : upstreamContract`. For FC, `downstreamContract` = TC↔FC — this is correct. BUT `updateLaborBudget` calls `supabase.from('project_contracts').update(...)` and this may fail silently due to RLS. The RLS policy we added for `project_sov` may not cover `project_contracts`.

**Fix**: 
- Check/add RLS policy on `project_contracts` allowing FC org members to update `labor_budget` on contracts where they are the `from_org_id` or `to_org_id`
- Verify the `BudgetTracking` component renders for FC (it should based on the code)

### 5. PO wizard first page flashes
**Root cause**: `POWizardV2.tsx` line 174-195 — the `useEffect` that resets state runs on `open` change. When `open` becomes true, it resets `screen` to `'header'`. But `loadingSuppliers` starts as `true` (line 92), and when the suppliers load (line 167 `setLoadingSuppliers(false)`), it triggers a re-render of `HeaderScreen` which causes the visible flash as the skeleton placeholders disappear.

**Fix** (`POWizardV2.tsx`):
- Don't render the dialog content until `loadingSuppliers` is false, OR
- Add a brief transition/fade to the header screen content
- Simplest: show a centered loading spinner instead of the full header skeleton during initial supplier fetch

### 6. System supplier PO sends to nowhere
**Root cause**: When a PO is created with the system supplier (`is_system = true`), the supplier has no `contact_info` email. The `project_designated_suppliers` table has a `po_email` field, but if the user hasn't set one, the PO is created as a draft with "no supplier email found" warning.

**Fix** (`PurchaseOrdersTab.tsx` and `PODetail.tsx`):
- After PO creation, if `!supplierEmail` and the supplier is a system supplier, show a dialog/prompt asking the user to enter an email address to send the PO to
- Save that email to `project_designated_suppliers.po_email` for future POs
- Then invoke `send-po` with that email
- Similar logic needed in `PODetail.tsx` send action and `COMaterialsPanel.tsx`

### 7. Teach Sasha every page
**Root cause**: `useSashaContext.ts` is missing context for many pages/tabs.

**Fix** (`useSashaContext.ts`): Add entries for:
- `tab === 'change-orders'` — Change Orders list with status, pricing, role-based visibility
- `tab === 'schedule'` — Project schedule with milestones and task tracking
- `tab === 'daily-log'` — Daily field logs with photos, notes, weather
- `tab === 'setup'` — Project setup wizard with phases: Details, Scope, Contracts, SOV, Team
- `/settings` — App settings page
- `/org/team` — Organization team management
- `/financials` — already exists but add more detail
- `/project/:id/change-orders/:coId` — Individual Change Order detail page
- Remove duplicate `/purchase-orders` entry (line 41-42)

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Move AttentionBanner above ProjectOverviewV2, remove `lg:hidden` |
| `src/components/project/OverviewContractsSection.tsx` | FC: use `downstreamContract` instead of `upstreamContract` |
| `src/components/project/OverviewProfitCard.tsx` | Add inline owner contract editor for GC |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Show loading state instead of flashing header |
| `src/components/project/PurchaseOrdersTab.tsx` | Prompt for email when system supplier has no email |
| `src/components/purchase-orders/PODetail.tsx` | Same email prompt for send action |
| `src/hooks/useSashaContext.ts` | Add all missing page/tab contexts |
| DB migration | Add RLS policy for FC to update `labor_budget` on `project_contracts` |

