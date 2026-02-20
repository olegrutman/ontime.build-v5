
# Implement All 10 Improvements

## Overview
Ten targeted improvements to performance, stability, and UX -- no new features, no new components.

---

## 1. QueryClient Defaults (Quick Win)

**File:** `src/App.tsx`

Configure the `QueryClient` with sensible defaults to reduce unnecessary refetches:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## 2. Consolidate Duplicate `useAuth()` Calls

**File:** `src/components/project/WorkOrdersTab.tsx`

Lines 38 and 52 both call `useAuth()`. Merge into a single call:

```typescript
const { currentRole, user, permissions, userOrgRoles } = useAuth();
```

Remove the second `useAuth()` call on line 52.

---

## 3. Parallelize Dashboard Queries

**File:** `src/hooks/useDashboardData.ts`

The `fetchData` function makes 12+ sequential `await` calls. Group independent queries with `Promise.all`:

- **Group 1 (project discovery):** `ownedProjects`, `participantsData`, `teamMembershipsData` -- run in parallel
- **Group 2 (project details):** `contracts`, `pendingCOs`, `pendingInvoices`, `sentInvites`, `incomingInvitesData` -- all depend on `projectIds`, run in parallel
- **Group 3 (financials):** `allInvoices`, `thisMonthCOs`, `reminders` -- run in parallel

This should roughly halve dashboard load time.

---

## 4. Route Protection (RequireAuth Wrapper)

**File:** `src/App.tsx`

Create a small inline `RequireAuth` component that checks `useAuth()` and redirects unauthenticated users to `/auth`:

```typescript
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Skeleton className="h-8 w-32" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
```

Wrap all authenticated routes (dashboard, project, financials, etc.) with `<RequireAuth>`. Leave `/`, `/demo`, `/auth`, `/signup` unprotected.

---

## 5. Lazy Loading Pages

**File:** `src/App.tsx`

Replace static imports with `React.lazy()` for all page components and wrap `Routes` in `<Suspense>`:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectHome = lazy(() => import('./pages/ProjectHome'));
// ...etc for all pages
```

Add a `<Suspense fallback={<LoadingSpinner />}>` around the `<Routes>` block.

---

## 6. Error Boundary

**File:** `src/App.tsx` (inline) or `src/components/ErrorBoundary.tsx`

Create a simple class-based `ErrorBoundary` component that catches render errors and shows a "Something went wrong" fallback with a retry button. Wrap the main `<Routes>` block with it.

---

## 7. Memoize Expensive Derived State in WorkOrdersTab

**File:** `src/components/project/WorkOrdersTab.tsx`

Wrap `filteredChangeOrders`, `sortedOrders`, `fixedOrders`, `tmOrders`, and `statusCounts` in `useMemo`:

```typescript
const statusCounts = useMemo(() => ({
  ALL: changeOrders.length,
  draft: changeOrders.filter(co => co.status === 'draft').length,
  // ...
}), [changeOrders]);

const sortedOrders = useMemo(() => {
  const filtered = activeTab === 'ALL' ? changeOrders : changeOrders.filter(co => co.status === activeTab);
  return [...filtered].sort(/* ... */);
}, [changeOrders, activeTab]);
```

---

## 8. Standardize Empty and Loading States

**Files:** Multiple tab components (WorkOrdersTab, InvoicesTab, PurchaseOrdersTab, RFIsTab)

These already have reasonable loading/empty states. The improvement is to ensure consistency:
- Loading: always use 3 `<Skeleton>` cards
- Empty: always use centered icon + message + optional CTA button
- Review each tab and align the pattern (minor tweaks only)

---

## 9. Optimistic UI for Status Changes

**File:** `src/pages/Dashboard.tsx`

In `handleStatusChange` and `handleArchive`/`handleUnarchive`, optimistically update the local project list before the API call, and roll back on error:

```typescript
const handleUnarchive = async (projectId: string) => {
  // Optimistic update
  const previousProjects = projects;
  // Update local state immediately...
  const { error } = await supabase.from('projects').update({ status: 'active' }).eq('id', projectId);
  if (error) {
    // Rollback
    toast({ title: 'Error', ... });
  }
};
```

---

## 10. Mobile Bottom Nav -- Add Global Pages

**File:** `src/components/layout/BottomNav.tsx`

Move "Financials" and "RFIs" links into the dashboard-level bottom nav. With `canManageOrg` conditional, the bar can have up to 5 items. Add Change Orders to the "More" drawer if on dashboard context:

```typescript
const dashboardItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Financials', icon: DollarSign, path: '/financials' },
  { label: 'Work Orders', icon: ClipboardList, path: '/change-orders' },
  { label: 'Partners', icon: Handshake, path: '/partners' },
  { label: 'More', icon: MoreHorizontal },  // opens drawer with Reminders, Team, RFIs
];
```

This gives mobile users quick access to the most-used global pages.

---

## Implementation Order

| Step | Improvement | Risk | Files |
|------|------------|------|-------|
| 1 | QueryClient defaults | None | App.tsx |
| 2 | Consolidate useAuth | None | WorkOrdersTab.tsx |
| 3 | Parallelize dashboard queries | Low | useDashboardData.ts |
| 4 | RequireAuth wrapper | Low | App.tsx |
| 5 | Lazy loading | Low | App.tsx |
| 6 | Error boundary | None | App.tsx or new file |
| 7 | Memoize derived state | None | WorkOrdersTab.tsx |
| 8 | Standardize empty/loading | None | Multiple tabs |
| 9 | Optimistic UI | Low | Dashboard.tsx |
| 10 | Mobile bottom nav | Low | BottomNav.tsx |
