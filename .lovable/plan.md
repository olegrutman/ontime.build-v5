

# CO List Page, Combine Drawer, CO Detail Page & Route

## What to build

1. **Replace `COListPage.tsx`** — Full list page showing grouped COs (mine by status + shared with me), with selection checkboxes for combining, status/reason badges, and navigation to detail page.

2. **Create `CombineDrawer.tsx`** — Bottom drawer that lets users combine 2+ selected COs into one, with optional title input.

3. **Create `CODetailPage.tsx`** — Full page with sidebar layout showing CO header (status, pricing, reason, location, date), scope line items with labor entries, materials section, equipment section, financial summary (role-aware: GC sees billed totals, TC sees cost+markup+margin, FC sees own labor), NTE gauge, and details sidebar.

4. **Add route in `App.tsx`** — Add `/projects/:projectId/change-orders/:coId` as a protected route, lazy-loading `CODetailPage`.

5. **Update barrel export** — Add `CODetailPage` and `CombineDrawer` to `index.ts`.

## Key details

- `COListPage` navigates to `/projects/${projectId}/change-orders/${id}` on row click
- `CODetailPage` uses `useParams` to get `projectId` and `coId`, calls `useChangeOrderDetail(coId)`
- `CODetailPage` back button navigates to `/projects/${projectId}?tab=change-orders`
- Financial display is role-aware via `useAuth().currentRole` — GC sees only billed amounts, TC sees full breakdown with margin, FC sees own labor only
- `CombineDrawer` calls `combineCOs.mutateAsync` from `useChangeOrders`
- The Checkbox import uses the existing Radix checkbox component from `@/components/ui/checkbox`
- Uses `date-fns` `formatDistanceToNow` and `format` for dates
- The lazy import pattern matches existing pages in App.tsx

## Files to create/modify

| File | Action |
|------|--------|
| `src/components/change-orders/COListPage.tsx` | Replace contents |
| `src/components/change-orders/CombineDrawer.tsx` | Create |
| `src/components/change-orders/CODetailPage.tsx` | Create |
| `src/components/change-orders/index.ts` | Add exports |
| `src/App.tsx` | Add lazy import + route |

