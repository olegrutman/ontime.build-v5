

# Fix: Organization Address Not Saving on Platform Create

## Bugs Found

1. **Edge Function (`platform-support-action`)**: The `CREATE_ORGANIZATION` case (line 367-376) inserts `name`, `type`, `org_code`, `phone`, and `created_by` but completely omits `address`. Even if the frontend sent address data, it would be ignored.

2. **Create Organization Dialog (`PlatformOrgs.tsx`)**: The dialog has no address input fields (street, city, state, zip). There's no way for a Platform Owner to enter an address when creating an organization.

## Fix Plan

### 1. Add address fields to the Create Organization dialog in `PlatformOrgs.tsx`

- Add state variables for `orgStreet`, `orgCity`, `orgState`, `orgZip`
- Add address input fields (street, city, state, zip with US_STATES dropdown) to the dialog form, matching the pattern used in `CompanyStep.tsx`
- Pass `org_address` object in the `handleCreate` function body sent to the edge function

### 2. Update the edge function `platform-support-action/index.ts`

- In the `CREATE_ORGANIZATION` case (~line 352), destructure `org_address` from params
- Include `address: org_address || null` in the organization insert statement (line 368-376)

### Files to Change

- `src/pages/platform/PlatformOrgs.tsx` -- Add address form fields + pass address in API call
- `supabase/functions/platform-support-action/index.ts` -- Accept and persist `org_address` field

