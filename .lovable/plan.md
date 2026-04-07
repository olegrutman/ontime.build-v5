

# Fix Estimate PDF Parsing Timeout on Navigation

## Problem

The PDF parsing flow is fully synchronous: the client uploads a PDF, calls the `parse-estimate-pdf` edge function, and waits for the AI response (15–45 seconds). If the user navigates away during this time, the component unmounts, the promise result is lost, and the user has to start over. The edge function itself may also hit timeout limits on large PDFs.

## Solution

Convert to an async queue pattern: the edge function saves parsed results to the database, and the client polls for completion. This way, if the user leaves and comes back, the results are waiting.

### Step 1: Add status/result columns to `estimate_pdf_uploads`

Migration:
```sql
ALTER TABLE public.estimate_pdf_uploads
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN parsed_result jsonb,
  ADD COLUMN error_message text,
  ADD COLUMN completed_at timestamptz;
```

Status values: `pending` → `processing` → `completed` | `failed`

### Step 2: Update `parse-estimate-pdf` edge function

After receiving `estimateId` + `filePath`, the function will:
1. Look up the `estimate_pdf_uploads` row by `estimate_id` + `file_path`
2. Set `status = 'processing'`
3. On success: set `status = 'completed'`, store `parsed_result` (the packs JSON), set `completed_at`
4. On failure: set `status = 'failed'`, store `error_message`
5. Still return the result in the HTTP response for the happy path (client still connected)

This makes the function idempotent — results are persisted regardless of whether the client is listening.

### Step 3: Update `PdfUploadStep.tsx` — add resume polling

On mount, check if there's a `processing` or `completed` upload for this estimate:
```typescript
// On mount or when estimateId changes:
const { data: existing } = await supabase
  .from('estimate_pdf_uploads')
  .select('*')
  .eq('estimate_id', estimateId)
  .in('status', ['processing', 'completed'])
  .order('uploaded_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (existing?.status === 'completed') {
  // Resume — deliver parsed_result directly
  onParsed(existing.parsed_result.packs, ...);
} else if (existing?.status === 'processing') {
  // Show "parsing in progress" UI and poll
  startPolling(existing.id);
}
```

Polling: every 3 seconds, check the row's `status`. When `completed`, deliver the result. When `failed`, show error. Stop after 120 seconds (hard timeout).

For the normal flow (user stays on page): the existing synchronous `supabase.functions.invoke()` call still works and returns immediately. The polling is a fallback for when the user navigated away and returned.

### Step 4: Update `EstimateUploadWizard.tsx`

When the wizard opens with an `estimateId`, `PdfUploadStep` will auto-check for in-progress or completed parses. If found, it skips straight to the review step. No other wizard changes needed.

## Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `status`, `parsed_result`, `error_message`, `completed_at` columns to `estimate_pdf_uploads` |
| `supabase/functions/parse-estimate-pdf/index.ts` | Write parse results to `estimate_pdf_uploads` row on success/failure |
| `src/components/estimate-upload/PdfUploadStep.tsx` | Add on-mount resume check + polling fallback for in-progress parses |

### What is NOT changing
- `EstimateUploadWizard.tsx` — no structural changes needed
- CSV upload flow — unaffected
- `CatalogMatchStep`, `PackReviewStep` — unchanged
- RLS on `estimate_pdf_uploads` — already scoped by user

