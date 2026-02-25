

# Upload SOV and AI-Build from User Document

## Overview

Add a "Upload Your SOV" option alongside the existing "Create SOVs from Template" button. Users upload a PDF or CSV of their own Schedule of Values, an AI edge function parses it into structured line items (name + percentage), and the system creates `project_sov` + `project_sov_items` records automatically -- mapped to the selected contract.

## User Flow

```text
SOV Tab (no SOVs yet)
  +-----------------------------------------+
  |  Create Schedule of Values              |
  |                                         |
  |  [Create SOVs from Template]            |
  |          -- or --                       |
  |  [Upload Your SOV]                      |
  +-----------------------------------------+

User clicks "Upload Your SOV"
  -> File picker dialog opens (PDF/CSV)
  -> Select which contract to apply to
  -> Upload file
  -> Loading spinner: "AI is reading your SOV..."
  -> AI returns parsed items
  -> Review screen: table of item names + percentages
  -> User can edit/remove items, percentages must total 100%
  -> "Apply SOV" button creates records
```

## Changes

### 1. New Edge Function: `supabase/functions/parse-sov-document/index.ts`

Accepts a base64-encoded PDF/CSV file and the contract amount. Uses Lovable AI (Gemini Flash) with tool calling to extract structured SOV line items:

- **Input**: `{ file_base64, file_type, contract_sum }`
- **AI prompt**: "Extract Schedule of Values line items from this document. Each item has a name/description and either a dollar amount or percentage of total contract."
- **Tool schema**: Returns `{ items: [{ name: string, percent: number }] }` normalized to 100%
- **Output**: `{ items: [{ name, percent }], warnings: string[] }`

Handles rate limits (429) and credit exhaustion (402) with proper error responses.

### 2. New Component: `src/components/sov/UploadSOVDialog.tsx`

A dialog with three stages:
1. **Upload**: File input (PDF/CSV), contract selector dropdown (if multiple contracts exist)
2. **Processing**: Spinner while AI parses
3. **Review**: Editable table of parsed items (name, percent, calculated dollar value). Percentage total indicator. Users can delete rows, edit names/percents. "Apply" button is enabled only when total = 100%.

On apply, creates `project_sov` and `project_sov_items` records using the same pattern as `createAllSOVs` in the hook.

### 3. Update: `src/hooks/useContractSOV.ts`

Add a new `createSOVFromUpload` function that accepts:
- `contractId: string`
- `items: { name: string; percent: number }[]`

Creates the SOV record and items, same as template creation but using user-provided items instead of template-generated ones. Exposed from the hook.

### 4. Update: `src/components/sov/ContractSOVEditor.tsx`

In the empty state (lines 180-228), add the "Upload Your SOV" button below the existing "Create SOVs from Template" button with an "-- or --" divider. Wire it to open the `UploadSOVDialog`.

Also add an upload option in the "missing SOVs" alert for individual contracts.

### 5. Config: `supabase/config.toml`

Add entry for the new edge function:
```toml
[functions.parse-sov-document]
verify_jwt = false
```

### 6. Export: `src/components/sov/index.ts`

Add `UploadSOVDialog` export.

## Technical Details

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/parse-sov-document/index.ts` | Create | AI edge function to parse uploaded SOV documents |
| `supabase/config.toml` | Edit | Add function config entry |
| `src/components/sov/UploadSOVDialog.tsx` | Create | Upload dialog with file input, AI processing, and review table |
| `src/components/sov/ContractSOVEditor.tsx` | Edit | Add upload button to empty state and missing-SOV alerts |
| `src/hooks/useContractSOV.ts` | Edit | Add `createSOVFromUpload` function |
| `src/components/sov/index.ts` | Edit | Export new component |

### AI Parsing Strategy

The edge function uses tool calling (same pattern as `parse-estimate-pdf`) to extract structured data:

- System prompt tells AI to identify SOV line item names and their dollar amounts or percentages
- If the document has dollar amounts, the function converts them to percentages using the contract sum
- Percentages are normalized to sum to exactly 100% (last item gets remainder)
- Warnings are returned for items that couldn't be parsed or if total seems off

### File Size / Format Handling

- PDF: Sent as base64 image content to the AI model (same as estimate parser)
- CSV: Parsed server-side into text, sent as user message content
- Max file size enforced client-side (10MB)

