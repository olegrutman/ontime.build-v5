

# Bug Report: Profile Updates Don't Persist in the Form

## Root Cause

**`useState` is being misused as `useEffect` for form initialization** (lines 95-138 of `Profile.tsx`).

The code calls `useState(() => { ... })` three times to initialize forms from fetched data. This is wrong — `useState`'s initializer runs only once on mount, **before** the async data has loaded. So `profile`, `organization`, and `orgSettings` are all `null` at that point, and the initializers do nothing.

## Why It Appears to "Not Update"

There is a fallback mechanism at lines 141-178 that sets form state during render, but it only triggers when the form field is empty AND the data field is truthy. This means:

1. **First load works** — the fallback populates the form from the fetched data.
2. **After saving**, the `updateProfile` function updates local state in `useProfile` (e.g., `setProfile(prev => ({ ...prev, ...updates }))`), but the form state in `Profile.tsx` is NOT re-synced because the fallback condition (`personalForm.first_name === ''`) is no longer true — the form already has values.
3. **The real problem**: if the database update succeeds but the user navigates away and comes back, the data loads correctly. But if they stay on the page, the form doesn't reflect the server state because there's no re-fetch or re-sync after save.

Additionally, there may be an **RLS issue** — the `updateProfile` call may silently fail (returns no error but updates 0 rows) if the profiles table RLS policy doesn't allow the user to update their own row.

## Fix Plan

**File: `src/pages/Profile.tsx`**

1. Replace the three misused `useState(() => { ... })` calls (lines 95-138) with proper `useEffect` hooks that re-sync form state whenever the underlying data changes. This ensures forms are populated after async fetch completes and re-populated if data changes after a save.

```tsx
useEffect(() => {
  if (profile) {
    setPersonalForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      preferred_contact_method: profile.preferred_contact_method || 'email',
      timezone: profile.timezone || 'America/Denver',
      job_title: profile.job_title || '',
    });
  }
}, [profile]);
```

Same pattern for `organization` → `orgForm` and `orgSettings` → `pricingForm`.

2. Remove the redundant render-time fallback sync blocks (lines 141-178) since the `useEffect` hooks handle it properly.

**No other files need changes.** The `useProfile` hook's `updateProfile` function correctly updates local state after a successful save, which will trigger the new `useEffect` to re-sync the form.

