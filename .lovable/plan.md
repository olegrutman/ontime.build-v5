

# Fix: CO Detail Route Returns 404

## Problem
Clicking a CO card navigates to `/project/{id}/change-orders/{coId}` but the route in `App.tsx` is registered as `/projects/:projectId/change-orders/:coId` (note the "s" in "projects"). Every CO card click hits the 404 catch-all.

## Fix
One line change in `App.tsx` line 177: change `/projects/:projectId/change-orders/:coId` to `/project/:id/change-orders/:coId` to match the navigation pattern used everywhere else.

| File | Change |
|------|--------|
| `src/App.tsx` line 177 | `/projects/:projectId/...` → `/project/:id/change-orders/:coId` |

Also update the `CODetail.tsx` / `CODetailPage.tsx` component to read from `useParams` with `:id` instead of `:projectId` if needed.

