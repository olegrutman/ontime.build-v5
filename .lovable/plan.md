

# Add Organization Logo Upload for Document Downloads

## Summary
Add a `logo_url` column to the `organizations` table, create a storage bucket for logos, add a logo upload UI to the Profile/Settings page, and inject the logo into all downloadable document templates (invoices, POs, work orders, credit memos, project summaries).

## Database Changes (1 migration)

1. **Add `logo_url` column** to `organizations`:
   ```sql
   ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
   ```

2. **Create `org-logos` storage bucket** (public, so edge functions can render `<img>` tags pointing to it):
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);
   ```

3. **RLS on `storage.objects`** for the bucket:
   - Authenticated users can upload/update/delete files in their own org's folder (`org-logos/{org_id}/...`)
   - Public read access (bucket is public)

## Frontend Changes

### `src/pages/Profile.tsx` — Add Logo Upload Section
- Add a "Company Logo" card in the Company section with:
  - Preview of current logo (or placeholder)
  - File input (accept `image/png, image/jpeg, image/svg+xml`)
  - Upload button that stores to `org-logos/{org_id}/logo.{ext}`
  - Updates `organizations.logo_url` with the public URL
  - Delete button to remove logo

### `src/hooks/useProfile.ts` — Expose `organization.logo_url`
- Already fetches full organization row; no change needed once the column exists.

## Edge Function Changes (5 functions)

Each download function will fetch the issuing organization's `logo_url` and render it in the HTML header:

1. **`invoice-download`** — Add logo above "Application for Payment" header, sourced from `from_org`
2. **`po-download`** — Add logo above "Purchase Order" header, sourced from `po.organization`
3. **`work-order-download`** — Add logo in header area, sourced from the creating org
4. **`return-credit-memo`** — Add logo above "Credit Memo" header
5. **`project-summary-download`** — Add logo above project summary header

Logo rendering pattern (shared across all functions):
```html
${logoUrl ? `<img src="${logoUrl}" style="max-height:60px;max-width:200px;margin-bottom:12px;" alt="Company Logo" />` : ''}
```

## Technical Details

- Storage path convention: `org-logos/{organization_id}/logo.png`
- On upload, old file is replaced (upsert)
- Public bucket means the URL works in downloaded HTML files without auth
- Image validation: client-side check for type and max size (2MB)
- No changes to `types.ts` needed (auto-generated)

## Files Modified
1. **1 migration** — `logo_url` column + storage bucket + RLS policies
2. **`src/pages/Profile.tsx`** — Logo upload UI
3. **`supabase/functions/invoice-download/index.ts`** — Logo in header
4. **`supabase/functions/po-download/index.ts`** — Logo in header
5. **`supabase/functions/work-order-download/index.ts`** — Logo in header
6. **`supabase/functions/return-credit-memo/index.ts`** — Logo in header
7. **`supabase/functions/project-summary-download/index.ts`** — Logo in header

