

# Fix PDF Export for Invoices, POs, and Work Orders

## Root Cause Analysis

There are 5 separate issues preventing exports from working:

1. **Edge functions not deployed** -- `invoice-download` and `po-download` both return 404 (not found). They need to be deployed.
2. **Auth tokens not sent** -- The Invoice export button uses `window.open()` which is a plain browser navigation. It does NOT include the `Authorization: Bearer <token>` header that the edge function requires. Result: always returns 401 Unauthorized.
3. **PO download gated behind `download_token`** -- The download button only shows if the PO has a `download_token` field. Many POs don't have one set, so users can't download at all. The authenticated fallback also uses `window.open()` (same auth problem).
4. **Work Orders have no export feature** -- No download/export button exists anywhere in the work order detail page.
5. **CORS headers incomplete** -- Both edge functions are missing required Supabase client headers, which can cause browser preflight (CORS) failures.

## Fix Plan

### 1. Fix CORS Headers in Both Edge Functions

Update the `corsHeaders` in both `invoice-download/index.ts` and `po-download/index.ts` to include all required headers:

```
authorization, x-client-info, apikey, content-type,
x-supabase-client-platform, x-supabase-client-platform-version,
x-supabase-client-runtime, x-supabase-client-runtime-version
```

### 2. Fix Invoice Export -- Pass Auth Token Properly

**File: `src/components/invoices/InvoiceDetail.tsx`**

Replace the `window.open()` call with a `fetch()` + blob approach:
- Get the user's auth token from `supabase.auth.getSession()`
- Call the edge function with `fetch()` including `Authorization: Bearer <token>`
- Receive the HTML response
- Create a Blob URL and open it in a new tab (user can then Ctrl+P to save as PDF)
- Add loading state on the button while fetching

### 3. Fix PO Export -- Remove Token Dependency, Add Auth-Based Download

**File: `src/components/purchase-orders/PODetail.tsx`**

- Always show the Download button (don't gate behind `download_token`)
- Use the authenticated download mode: `fetch()` with `Authorization` header and `po_id` parameter
- Same blob approach as invoices
- Keep the token-based download as a fallback for supplier email links

### 4. Create Work Order Export

**New File: `supabase/functions/work-order-download/index.ts`**

Create a new edge function that:
- Accepts `work_item_id` parameter with an auth token
- Fetches the work item, its labor entries, materials, and participants
- Generates a professional HTML document (matching the invoice/PO style)
- Returns HTML that can be printed as PDF

**File: `src/components/work-item/WorkItemActions.tsx`**

- Add an "Export PDF" button to the work order actions sidebar
- Use the same `fetch()` + blob approach to call the new edge function

### 5. Deploy All Edge Functions

Deploy `invoice-download`, `po-download`, and the new `work-order-download` function. These functions use JWT verification (default behavior), so no config.toml changes needed.

## Technical Details

### Auth Token Fetch Pattern (used in all 3 exports)

```text
1. Get session: supabase.auth.getSession()
2. Extract access_token from session
3. fetch(edgeFunctionUrl, { headers: { Authorization: "Bearer " + token } })
4. Get response as text (HTML)
5. Create Blob with type "text/html"
6. URL.createObjectURL(blob) -> open in new tab
7. Show loading spinner during fetch, toast on error
```

### Work Order Download Edge Function

The new edge function will generate an HTML document containing:
- Work item header (title, code, type, state)
- Description and location
- Pricing summary (if applicable)
- Labor entries table (hours, rates)
- Materials table (quantities, costs)
- Participants list
- Footer with generation timestamp

It will follow the same authentication pattern as the invoice function (JWT via Authorization header, RLS-based data access).

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/invoice-download/index.ts` | Fix CORS headers |
| `supabase/functions/po-download/index.ts` | Fix CORS headers |
| `supabase/functions/work-order-download/index.ts` | **New** -- work order HTML export |
| `src/components/invoices/InvoiceDetail.tsx` | Fix export button to use fetch + auth token |
| `src/components/purchase-orders/PODetail.tsx` | Fix download to use fetch + auth, always show button |
| `src/components/work-item/WorkItemActions.tsx` | Add "Export PDF" button |

### What Stays the Same

- All edge function business logic (HTML generation, data queries)
- All existing button positioning and styling
- Token-based PO download for supplier email links (kept as-is)
- All database tables and RLS policies (no migrations needed)

