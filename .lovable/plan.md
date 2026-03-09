

# Schedule Tab Bug Report

After reviewing all schedule components, I found **3 bugs** — one critical and two minor.

---

## Bug 1 (Critical): Form shows stale data when switching between items

**The problem:** `ScheduleItemForm` initializes state with `useState(item?.title ?? '')` etc. React does NOT re-run `useState` initializers when props change. So if you click Item A, close the form, then click Item B — the form still shows Item A's data (title, dates, progress, etc.).

**The fix:** Add a `useEffect` (or better, use `key` prop) to reset all form state when `item` changes. The cleanest fix is adding `key={editingItem?.id ?? 'new'}` on the `<ScheduleItemForm>` in `ScheduleTab.tsx` — this forces React to remount the component with fresh state.

**File:** `src/components/schedule/ScheduleTab.tsx` — add `key` prop to `<ScheduleItemForm>`

---

## Bug 2 (Minor): Missing `DialogDescription` causes console warning

The console shows: `Warning: Missing Description or aria-describedby for DialogContent`. The `ScheduleItemForm` dialog has a `DialogTitle` but no `DialogDescription`, which is required by Radix for accessibility.

**The fix:** Add a hidden `DialogDescription` inside the `DialogHeader`.

**File:** `src/components/schedule/ScheduleItemForm.tsx`

---

## Bug 3 (Minor): Update mutation sends `sov_item` join data back to the database

When `updateItem` is called, it spreads the full `ScheduleItem` (including the computed `sov_item` nested object) into the `.update()` call. Supabase will reject or ignore unknown columns, but it's sloppy and could cause errors. The `handleSave` in `ScheduleItemForm` doesn't include `sov_item`, but if any caller passes the full item object, it would break.

**The fix:** Strip `sov_item` from the update payload in `useProjectSchedule.ts`.

**File:** `src/hooks/useProjectSchedule.ts`

---

## Summary of fixes

| File | Fix |
|------|-----|
| `ScheduleTab.tsx` | Add `key={editingItem?.id ?? 'new'}` to `<ScheduleItemForm>` |
| `ScheduleItemForm.tsx` | Add `<DialogDescription>` for accessibility |
| `useProjectSchedule.ts` | Strip `sov_item` from update mutation payload |

All three are quick, low-risk fixes.

