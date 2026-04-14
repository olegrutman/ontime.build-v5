

# Allow Platform Owner to Edit SOV Item Names in Platform Project Detail

## What
Make the Item Name column in the platform SOV tab editable inline — click to edit, Enter/blur to save. Only the name changes; no financial values are touched.

## Changes

### 1. Database migration
Add an UPDATE policy on `project_sov_items` so platform users can update the `item_name` column:
```sql
CREATE POLICY "Platform users can update SOV item names"
ON public.project_sov_items FOR UPDATE
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));
```

### 2. `src/pages/platform/PlatformProjectDetail.tsx`
- Add `editingItemId` state and an `Input` import
- On the Item Name cell: click to enter edit mode, show an `Input` pre-filled with current name
- On blur/Enter: call `supabase.from('project_sov_items').update({ item_name }).eq('id', itemId)`, then update local state
- On Escape: cancel edit

Only the name cell becomes editable — all other columns stay read-only.

