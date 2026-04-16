

# Allow Platform Owner to Edit Organization Profile

## Summary
Add an "Edit Organization" capability to the platform org detail page (`PlatformOrgDetail.tsx`), allowing platform owners to update org profile fields (name, phone, address, trade, license number, insurance expiration, logo URL) via a new `EDIT_ORGANIZATION` action in the `platform-support-action` edge function.

## Changes

### 1. Edge Function: `supabase/functions/platform-support-action/index.ts`
- Add `EDIT_ORGANIZATION: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- Add a new `case "EDIT_ORGANIZATION"` handler that:
  - Accepts `organization_id` and `fields` (object)
  - Allowlist: `name`, `phone`, `address`, `trade`, `trade_custom`, `license_number`, `insurance_expiration_date`, `logo_url`
  - Snapshots before/after for audit log
  - Updates via `adminClient.from("organizations").update(...).eq("id", organization_id)`

### 2. Frontend: `src/pages/platform/PlatformOrgDetail.tsx`
- Add an "Edit Organization" button (visible to `PLATFORM_OWNER`)
- Add an edit dialog with fields:
  - **Name** (text input)
  - **Phone** (text input)
  - **Address** (street, city, state, zip — 4 inputs)
  - **Trade** (text input)
  - **License Number** (text input)
  - **Insurance Expiration** (date input)
- On save, call `platform-support-action` with `action_type: "EDIT_ORGANIZATION"` (requires a reason for the audit log)
- On success, reload the org data to reflect changes

### 3. Summary Card Enhancement
- Display additional org fields in the summary card: phone, address, trade, license number, insurance expiration — so the platform owner can see current values before editing

## Files Modified
1. `supabase/functions/platform-support-action/index.ts` — new action handler
2. `src/pages/platform/PlatformOrgDetail.tsx` — edit button, dialog, and enhanced summary card

