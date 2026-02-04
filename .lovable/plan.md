
Goal: Fix why you “can’t upload a PDF” by ensuring the Estimates page is actually accessible for Supplier users (right now it’s immediately showing an “Access Denied” toast and redirecting, so the upload UI/flow never gets a chance to run).

What I found (root cause)
- On `/estimates`, `SupplierProjectEstimates.tsx` runs this logic:

  - `currentOrg = userOrgRoles[0]?.organization`
  - `isSupplier = currentOrg?.type === 'SUPPLIER'`
  - In `useEffect`, if `!authLoading && !isSupplier`, it shows the “Access Denied” toast and navigates away.

- In practice, this can incorrectly fire even for Supplier users when:
  1) `userOrgRoles` is still empty/not populated at the moment `authLoading` flips to false, or
  2) the supplier org is not at index 0 (multi-org users), so `userOrgRoles[0]` is not the supplier org.

Evidence
- Your screenshot shows the user is clearly in a Supplier org (left rail shows SUPPLIER and the user card says Supplier), yet the page still throws “Access Denied”. That strongly indicates the page’s “isSupplier” detection is wrong or running before roles are ready.

Plan to fix (implementation)
1) Make Supplier-org detection reliable
   - Update `SupplierProjectEstimates.tsx` to find a Supplier org from all roles, not just `[0]`.
   - Example approach:
     - `const supplierRole = userOrgRoles.find(r => r.organization?.type === 'SUPPLIER')`
     - `const currentOrg = supplierRole?.organization`
     - `const isSupplier = !!currentOrg`
   - This solves the “wrong org at index 0” problem.

2) Don’t deny access until roles are actually loaded
   - Adjust the access-guard `useEffect` to wait until role data is present (or we’re sure it won’t be).
   - Practical guard logic:
     - If `authLoading` is true: do nothing.
     - If `user` is missing: redirect to `/auth` (or existing auth flow).
     - If `userOrgRoles` is still empty: show loading state (keep skeleton) and do not show “Access Denied” yet.
     - Only show “Access Denied” when:
       - roles are present AND none are Supplier.

3) Use the Supplier org consistently for data fetching
   - Replace existing uses of `currentOrg?.id` with the supplier org id derived above.
   - Ensure `fetchProjects()` / `fetchEstimates()` only run when `currentOrg` is defined.

4) Fix the next “hidden blocker” after access: Review tab still depends on legacy `supplierId`
   - In `SupplierProjectEstimates.tsx`, the “Review Items” tab currently renders the table only when `supplierId && (...)`.
   - That means: even if the PDF parses successfully, the review UI might not show (and it will look like parsing/upload “did nothing”).
   - Update `EstimateReviewTable` to accept `supplierOrgId` (or derive what it needs internally), and remove the `supplierId &&` gating similar to what we did for the upload component.
   - If `EstimateReviewTable` truly requires a `supplierId` for catalog matching, derive it from `supplier_org_id` in the backend function (already done for parsing) or do a safer lookup in the UI with clear error messaging if missing.

5) Add concrete error feedback for upload failures (so we can diagnose next time quickly)
   - In `EstimatePDFUpload.tsx`, when `uploadError` or `recordError` happens, show the actual error message in the toast (sanitized) and log the full error.
   - Common failure cases this will reveal:
     - Storage policy rejecting INSERT (RLS/policy mismatch)
     - Bucket missing or misconfigured
     - File type mismatch (PDFs sometimes come as `application/octet-stream` depending on OS/browser)

6) Verify end-to-end
   - Manual test path:
     1) Log in as the Supplier user
     2) Go to `/estimates`
     3) Create a new estimate (must be DRAFT)
     4) Open it → Upload tab → click “Upload PDF Estimate”
     5) Confirm:
        - Upload spinner appears
        - A row is created in `estimate_pdf_uploads`
        - Parsing runs (function log exists)
        - Review tab shows extracted items (even if no legacy supplier record exists)

Files that will be changed
- `src/pages/SupplierProjectEstimates.tsx`
  - Fix supplier org detection
  - Fix access guard timing
  - Remove fragile dependency on `userOrgRoles[0]`
  - (Likely) remove/replace `supplierId` gating in Review tab

- `src/components/estimate/EstimateReviewTable.tsx` (and any related estimate components)
  - Accept `supplierOrgId` or remove need for `supplierId`
  - Ensure review UI is reachable after parsing

- `src/components/estimate/EstimatePDFUpload.tsx`
  - Improve error messages surfaced to the user for upload/insert/parse failures

Risks / edge cases to handle
- Multi-organization users: choose Supplier org for this page deterministically.
- Roles truly not loaded: page should not incorrectly deny access (show loading).
- Supplier org exists but there is no legacy `suppliers` table record: upload and parsing should still work; review UI should not disappear.

Acceptance criteria
- A Supplier user can visit `/estimates` without seeing “Access Denied”.
- Upload card is clickable in the Upload tab for DRAFT estimates.
- Uploading a PDF results in a stored file + DB record + parse attempt.
- Parse success populates line items and the Review UI is visible to review/match items.

