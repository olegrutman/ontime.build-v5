

# Dead Code Cleanup — Round 2

## Audit Summary

| File | Active Imports Outside Self | Action |
|---|---|---|
| `NeedsAttentionTile.tsx` | None (only `index.ts` + `DashboardAttentionBanner` which is also being deleted) | **Delete** |
| `DashboardAttentionBanner.tsx` | None (only `index.ts`) | **Delete** |
| `DashboardFinancialCard.tsx` | `Financials.tsx` page imports it | **Keep** — cannot delete |
| `DashboardFinancialSnapshot.tsx` | None (only `index.ts`) | **Delete** |
| `ProjectFinancialsSection.tsx` | None (only `index.ts`) | **Delete** |
| `DashboardLiveFeed.tsx` | `Dashboard.tsx` imports it | **Delete** — replace with `RemindersTile` |
| `getCurrentUserOrg` in `AddTeamMemberDialog.tsx` | Dead function (always returns null) | **Remove function** |
| `WorkOrderSummaryCard.tsx` | `ProjectHome.tsx` imports it | **Keep** — active import |
| `InvoiceSummaryCard.tsx` | None (only `index.ts`) | **Delete** |
| `POSummaryCard.tsx` | None (only `index.ts`) | **Delete** |
| `SupplierPOSummaryCard.tsx` | None (only `index.ts`) | **Delete** |

### Important: `DashboardFinancialCard.tsx` stays
It is actively imported in `src/pages/Financials.tsx`. Cannot delete.

## Changes

### Deletions (8 files)
- `src/components/dashboard/NeedsAttentionTile.tsx`
- `src/components/dashboard/DashboardAttentionBanner.tsx`
- `src/components/dashboard/DashboardFinancialSnapshot.tsx`
- `src/components/dashboard/DashboardLiveFeed.tsx`
- `src/components/project/ProjectFinancialsSection.tsx`
- `src/components/project/InvoiceSummaryCard.tsx`
- `src/components/project/POSummaryCard.tsx`
- `src/components/project/SupplierPOSummaryCard.tsx`

### Code edits

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Replace `DashboardLiveFeed` import and usage with `RemindersTile` (pass `reminders`, `onComplete`, `onAdd` props) |
| `src/components/project/AddTeamMemberDialog.tsx` | Remove dead `getCurrentUserOrg` function (lines 267–271) |
| `src/components/dashboard/index.ts` | Remove exports for: `NeedsAttentionTile`, `AttentionItem`, `PendingInvite` (from NeedsAttentionTile), `DashboardAttentionBanner`, `DashboardFinancialSnapshot`, `DashboardLiveFeed` |
| `src/components/project/index.ts` | Remove exports for: `ProjectFinancialsSection`, `InvoiceSummaryCard`, `POSummaryCard`, `SupplierPOSummaryCard` |

### Dashboard.tsx RemindersTile replacement
`DashboardLiveFeed` only takes `reminders` (read-only display). Replacing with `RemindersTile` which needs `onComplete` and `onAdd` handlers. Dashboard already has `handleAddReminder` and a reminder completion handler — will wire those in.

