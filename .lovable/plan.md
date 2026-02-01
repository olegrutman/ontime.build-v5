
# Plan: Fix Duplicate Description on Work Order Page

## Problem Identified

The work order detail page displays the description **twice**:

1. **In `ChangeOrderHeader.tsx`** (lines 68-72):
   ```tsx
   {changeOrder.description && (
     <div className="p-4 bg-muted/30 rounded-lg">
       <p className="text-sm whitespace-pre-wrap">{changeOrder.description}</p>
     </div>
   )}
   ```

2. **In `ChangeOrderScopePanel.tsx`** (lines 90-99):
   ```tsx
   <div className="p-3 bg-muted/30 rounded-lg min-h-[60px]">
     {changeOrder.description ? (
       <p className="text-sm">{changeOrder.description}</p>
     ) : (
       <p className="text-sm text-muted-foreground italic">
         No description provided...
       </p>
     )}
   </div>
   ```

Both components are rendered on the `ChangeOrderDetailPage.tsx`, resulting in the description appearing twice on the page.

---

## Solution

Remove the description display from **`ChangeOrderHeader.tsx`** since:
- The `ChangeOrderScopePanel` is the proper place for the description (it has the edit functionality)
- The header should focus on title, status, location, and key metadata only

---

## File Changes

| File | Change |
|------|--------|
| `src/components/change-order-detail/ChangeOrderHeader.tsx` | Remove the description section (lines 67-72) |

---

## Implementation Details

### Remove from ChangeOrderHeader.tsx

Delete lines 67-72:
```tsx
// REMOVE THIS BLOCK:
{changeOrder.description && (
  <div className="p-4 bg-muted/30 rounded-lg">
    <p className="text-sm whitespace-pre-wrap">{changeOrder.description}</p>
  </div>
)}
```

The header will now only show:
- Title
- Project name
- Status badge
- Location
- Work type
- Created date

The description will remain exclusively in the `ChangeOrderScopePanel` component where it can be edited.

---

## Result

After this fix:
- Description appears only once (in the Scope Details panel)
- Edit functionality remains intact
- Header is cleaner and focused on key metadata
