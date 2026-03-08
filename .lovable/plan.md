

# Platform User Detail: Assign to Org, Address, Full Info

## 1. Show Full User Info

Expand the profile card in `PlatformUserDetail.tsx` to display all available profile fields:
- Email, Full Name, First Name, Last Name (already have email, full_name, phone)
- Phone, Job Title, Timezone, Language, Preferred Contact Method
- Created date (already shown)

Update the `ProfileData` interface and the `select('*')` query already fetches everything — just render the additional fields in the info card grid.

## 2. Add Address to Profiles

The `profiles` table currently has no address columns. Add a migration to add an `address` JSONB column (matching the `OrgAddress` pattern: street, city, state, zip).

**Migration:**
```sql
ALTER TABLE public.profiles ADD COLUMN address jsonb DEFAULT NULL;
```

Display the address in the profile card, and allow Platform Owner to edit it inline via a dialog.

## 3. Assign User to Organization

Add an "Assign to Organization" button (visible to Platform Owners) in the Organization Memberships card. This opens a dialog where the platform owner can:
- Search/select an organization (fetch from `organizations` table)
- Pick a role (based on org type, using `ALLOWED_ROLES_BY_ORG_TYPE`)
- Toggle admin status
- Provide a reason (via `SupportActionDialog`)

This will call the existing `ADD_MEMBER_NO_VERIFICATION` support action (which already exists in the edge function) but using the user's `user_id` directly instead of email lookup.

### Files to Edit

1. **`src/pages/platform/PlatformUserDetail.tsx`**
   - Expand `ProfileData` interface with all profile fields
   - Add full info display (job_title, first_name, last_name, timezone, language, preferred_contact_method, address)
   - Add "Edit Address" dialog for Platform Owners to set/update address
   - Add "Assign to Organization" button + dialog with org search, role select, admin toggle
   - Wire assign action to `ADD_MEMBER_NO_VERIFICATION` support action

2. **Database migration** — Add `address` JSONB column to `profiles` table

