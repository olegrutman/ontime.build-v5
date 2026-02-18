
# Pass RFI Context to AI Description Generator

## Problem

When converting an RFI to a Work Order, the RFI question and answer are stored in `data.description` (pre-filled by `RFIsTab.handleConvertToWO`), but the Review step's `generateDescription` function never sends this to the edge function. The AI generates a generic description without the RFI context.

## Changes

### 1. `src/components/work-order-wizard/steps/ReviewStep.tsx`

Add `rfi_context: data.description` to the body sent to the edge function, so the existing pre-filled description (containing "RFI-N: question\n\nAnswer: ...") is passed along.

### 2. `supabase/functions/generate-work-order-description/index.ts`

- Accept an optional `rfi_context` field in the request body
- When present, add it to the context parts sent to the AI (e.g. `RFI Context: {rfi_context}`)
- Update the system/user prompt to instruct the AI to incorporate the RFI question and answer into a concise scope of work description
