

# Sidebar Attention Notifications for Work Orders

## What We're Building
Add orange notification badges to the **Project Sidebar** next to nav items (Work Orders, Invoices, Purchase Orders) when there are items needing attention (e.g., submitted invoices to review, POs awaiting pricing).

## Approach

### 1. Create `useSidebarAttention` hook
**File**: `src/hooks/useSidebarAttention.ts`

A hook that takes `projectId`, `isSupplier`, `supplierOrgId` and returns a map of `{ [navKey: string]: number }` — counts of attention items per section. Reuses the same query logic from `UrgentTasksCard`:
- **change-orders**: Count WOs with status requiring attention (e.g., `SUBMITTED`)
- **invoices**: Count invoices with `status = 'SUBMITTED'`
- **purchase-orders**: Count POs with `status = 'SUBMITTED'`

### 2. Update `ProjectSidebar.tsx`
- Import and call `useSidebarAttention(id, isSupplier)`
- For each nav item, if `attentionCounts[item.key] > 0`, render a small orange dot/badge next to the label
- Badge styling: `bg-amber-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center`
- Pass attention counts into `FeatureNavItem` as well

### 3. Update `FeatureNavItem`
Accept an optional `attentionCount` prop and render the orange badge when > 0.

## Visual Result
```text
┌──────────────────────┐
│  ← Dashboard         │
│  ─────────────────   │
│  Overview             │
│  Project Info         │
│  ─────────────────   │
│  Work Orders    ● 3  │  ← orange badge
│  RFIs                 │
│  Estimates            │
│  ─────────────────   │
│  Invoices       ● 2  │  ← orange badge
│  Purchase Orders ● 1 │  ← orange badge
│  Returns              │
└──────────────────────┘
```

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useSidebarAttention.ts` | New hook — queries attention counts per section |
| `src/components/project/ProjectSidebar.tsx` | Consume hook, render orange badges on nav items |

