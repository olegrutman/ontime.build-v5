

# Wire Real Data + Team Card + Margin Card into GC Project Overview

## What's Changing

The `GCProjectOverviewContent` currently uses all hardcoded demo data. This plan wires it to real project data from `useProjectFinancials`, adds an expandable Team card with add-member capability, adds a missing Margin KPI card, and wires all action links to navigate to the correct project tabs.

## Changes

### 1. Wire real data into GCProjectOverviewContent

**File: `src/components/project/GCProjectOverviewContent.tsx`**

Expand the `Props` interface to accept the full `ProjectFinancials` object, `projectId`, and an `onNavigate` callback:

```typescript
interface Props {
  projectId: string;
  projectName?: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
}
```

Wire each card to real data:
- **Card 1 (Owner Budget)**: Use `financials.ownerContractValue` or `financials.upstreamContract?.contract_sum`, `financials.billedToDate`, `financials.outstanding`
- **Card 2 (TC Contract)**: Use `financials.upstreamContract` for contract value, `getContractCounterpartyName()` for TC name. Wire the save button to `financials.updateContract()`
- **Card 3 (Change Orders)**: Query `change_orders` table for the project (new useQuery inside component)
- **Card 4 (Materials)**: Use `financials.materialEstimate`, `financials.materialOrdered`, `financials.materialDelivered`
- **Card 5 (RFIs)**: Query `project_rfis` table for the project (new useQuery)
- **Card 6 (Invoices Paid)**: Use `financials.recentInvoices` filtered by PAID status, `financials.totalPaid`
- **Card 7 (Pending Approval)**: Filter `financials.recentInvoices` for SUBMITTED status
- **Card 8 (Scope Items)**: Use change orders data

### 2. Add Margin KPI Card (Card 9)

Add a new card between existing cards showing GC profit margin:
- Label: "GC MARGIN"
- Value: `ownerContractValue - tcContractValue`
- Percentage pill
- Expand table showing margin breakdown with CO impact

### 3. Add expandable Team Card

Embed the existing `ProjectOverviewTeamCard` logic into a new KpiCard-style expandable card:
- Collapsed: shows team count + material owner indicator
- Expanded: shows team members list, material responsibility indicator, designated supplier, and "Add Member" button using existing `AddTeamMemberDialog`
- Icon: 👥, accent: blue

### 4. Wire all navigation links

Replace all hardcoded button `onClick` handlers with `onNavigate()`:
- "Create New CO" → `onNavigate('change-orders')`
- "Create Purchase Order" → `onNavigate('purchase-orders')`
- "Create RFI" → `onNavigate('rfis')`
- "View →" links on RFIs → `onNavigate('rfis')`
- Invoice approve/reject → `onNavigate('invoices')`

### 5. Update ProjectHome.tsx to pass real data

**File: `src/pages/ProjectHome.tsx`** (line ~360)

Pass `financials`, `projectId`, and `handleTabChange` to the component:
```tsx
<GCProjectOverviewContent
  projectId={id!}
  projectName={project.name}
  financials={financials}
  onNavigate={handleTabChange}
/>
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Wire real data, add Team card, add Margin card, wire navigation links |
| `src/pages/ProjectHome.tsx` | Pass `financials`, `projectId`, `onNavigate` props |

### What is NOT changing
- Database schema, RLS policies
- `useProjectFinancials` hook (already has all needed data)
- `ProjectOverviewTeamCard` component (reuse its query logic inline)
- Other dashboard views (TC, FC, Supplier)

