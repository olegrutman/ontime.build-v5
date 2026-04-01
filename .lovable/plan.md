

# Fix: CO Redesign Not Showing on Desktop

## Root Cause
The page route `src/pages/CODetail.tsx` still imports and renders the **old** `CODetailPage` on desktop. The new `CODetailLayout` (with hero block, KPI strip, etc.) is only reached via `COJobTicket` on mobile. The redesigned `COSlideOver` component exists but is **never imported or used** anywhere in the app.

## Fix

### 1. Update `src/pages/CODetail.tsx`
Replace the old `CODetailPage` import with the new layout. Both mobile and desktop should use `CODetailLayout`:

```tsx
import { useParams } from 'react-router-dom';
import { CODetailLayout } from '@/components/change-orders/CODetailLayout';

export default function CODetail() {
  const { id: projectId, coId } = useParams<{ id: string; coId: string }>();
  if (!projectId || !coId) return null;
  return <CODetailLayout coId={coId} projectId={projectId} />;
}
```

This makes both desktop and mobile render the new hero-first layout with `COHeaderStrip`, `COKPIStrip`, `COHeroBlock`, two-column content, and `COStickyFooter`.

### 2. Wire up `COSlideOver` in `COListPage.tsx`
Check if `COListPage` has a card-click handler. If it navigates to the route, that's fine (step 1 fixes it). If it should open a slide-over panel on desktop instead, wire `COSlideOver` into the list page with a `selectedCoId` state.

**File**: `src/components/change-orders/COListPage.tsx`
- Add `useState<string | null>` for selected CO ID
- On card click (desktop): set selected CO ID → render `COSlideOver`
- On card click (mobile): navigate to route as before

### Files Modified
| File | Change |
|------|--------|
| `src/pages/CODetail.tsx` | Replace `CODetailPage` with `CODetailLayout` for all viewports |
| `src/components/change-orders/COListPage.tsx` | Wire `COSlideOver` for desktop card clicks |

