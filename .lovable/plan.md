

# Fix: CO Back Arrow Navigates to 404

## Problem
In `src/components/change-orders/CODetailPage.tsx` line 216, the back arrow navigates to `/projects/${projectId}?tab=change-orders` — but the app uses `/project/${projectId}` (singular). This causes a 404.

## Fix

**File: `src/components/change-orders/CODetailPage.tsx`** — Line 216

Change:
```ts
navigate(`/projects/${projectId}?tab=change-orders`)
```
To:
```ts
navigate(`/project/${projectId}?tab=change-orders`)
```

| File | Change |
|------|--------|
| `src/components/change-orders/CODetailPage.tsx` | Fix `/projects/` → `/project/` in back arrow navigation |

