

# Daily Log Page: Bug Report

## Bug 1: Manpower fires duplicate API calls on every tap
Looking at the network logs, there are **5 identical DELETE requests** to `daily_log_manpower` all at the same timestamp. Every time you tap +/- on the manpower stepper, `onChange` fires immediately, which calls `upsertManpower.mutate()`. Since the ManpowerCard calls `onChange` on every single tap (no debounce), and the mutation does a delete-then-insert, you get a race condition where multiple in-flight mutations overlap. This can cause data loss or duplicate rows.

**Fix**: Debounce the `handleManpowerChange` callback in `DailyLogPanel.tsx` (e.g. 500ms) so rapid taps batch into a single save. Same applies to delays and weather.

## Bug 2: Manpower doesn't sync when navigating dates
The `ManpowerCard` initializes local state in `useState(() => ...)` using the initial `entries` prop. The `useEffect` only updates local state when `entries.length > 0`. If you navigate to a date that has no manpower entries, the card will keep showing the previous date's values because the effect skips empty arrays.

**Fix**: Change the `useEffect` to always sync: `setLocal(entries.length > 0 ? entries : projectTrades.map(...))` and add `projectTrades` to the dependency.

## Bug 3: Weather temp changes trigger a save on every single tap
Each tap of the +/- temperature buttons calls `onChange` immediately, which calls `updateLog.mutate()`. There's no debounce, so tapping 5 times to go from 50 to 75 degrees fires 5 separate database updates.

**Fix**: Debounce `handleWeatherChange` in `DailyLogPanel.tsx`.

## Bug 4: Notes auto-save fires on every keystroke
The `QuickNotesCard` textarea calls `onChange` on every keystroke, and `DailyLogPanel` passes that straight to `updateLog.mutate()`. Typing a sentence fires dozens of database updates.

**Fix**: Debounce `handleNotesChange` (e.g. 800ms).

## Bug 5: Photos storage bucket may not exist
The `PhotosCard` uploads to a bucket called `daily-log-photos`, but there's no guarantee this storage bucket has been created. If it doesn't exist, photo uploads silently fail (the error is caught but no toast shown).

**Fix**: Ensure the bucket exists and show a toast on upload failure.

## Bug 6: Delays card has stale state on date navigation
Same issue as manpower -- `DelaysCard` initializes with `useState(delays)` and uses `useEffect` to sync, but if the new date has different delays, the effect replaces state. However, if you toggle a cause chip while the effect hasn't fired yet, you get stale data mixed with new data.

**Fix**: Add `logId` or `dateStr` as a key prop on the `DelaysCard` component so React unmounts/remounts it on date change, giving fresh state.

## Bug 7: Future date logs can be created
There's no guard preventing creation of daily logs for future dates. The date nav allows going forward (disabled at offset >= 0), but if offset somehow becomes positive or the code is bypassed, a future-dated log could be created. Currently the forward button is disabled, so this is low risk but the DB has no constraint either.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/components/daily-log/DailyLogPanel.tsx` | Debounce `handleManpowerChange`, `handleWeatherChange`, `handleNotesChange`, and `handleDelaysChange` (500-800ms). Add `key={dateStr}` to ManpowerCard and DelaysCard to reset state on date change. Show toast on photo upload error. |
| `src/components/daily-log/ManpowerCard.tsx` | Fix useEffect to also handle empty entries by re-initializing from projectTrades |
| `src/components/daily-log/PhotosCard.tsx` | Show error toast when upload fails |

