

# Edit Job Title & Phone for Platform Owner

## Approach

Add a single new support action `EDIT_USER_PROFILE` to the edge function that accepts a `fields` object (job_title, phone) and updates the profiles table. This keeps it auditable with the existing reason/logging pattern.

On the UI side, add two action buttons ("Edit Job Title", "Edit Phone") that open simple input dialogs followed by the SupportActionDialog for reason entry.

## Changes

### 1. Edge Function — `supabase/functions/platform-support-action/index.ts`
- Add `EDIT_USER_PROFILE: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- Add case handler that takes `user_id` and `fields` (object with allowed keys: `job_title`, `phone`), snapshots before, updates profiles table, snapshots after

### 2. UI — `src/pages/platform/PlatformUserDetail.tsx`
- Add state for edit job title dialog and edit phone dialog
- Add two new action buttons (Phone icon, Briefcase icon) in the Platform Owner actions row
- Each opens a small Dialog with an Input field, then flows into SupportActionDialog for reason
- On success, refresh profile data
- For phone: use `formatPhone` from `src/lib/formatPhone.ts` for formatting

### 3. No database migration needed
Both `job_title` and `phone` columns already exist on the profiles table.

