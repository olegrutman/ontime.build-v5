

# Wire Up AI-Powered Floor-Based SOV Generation

## Problem
The SOV page only shows the old "Create SOVs from Template" button which uses static templates. The new `generate-sov` edge function (AI-powered, floor-based) is built but not connected to the UI.

## Plan

### 1. Replace "Create SOVs from Template" with "Generate SOV" per contract

In `ContractSOVEditor.tsx`, replace the empty-state UI:

- **Primary action**: "Generate SOV" button that calls the `generate-sov` edge function for each contract individually
- Add a loading/generating state with a spinner
- Keep "Upload Your SOV" as secondary option
- After generation completes, call `refresh()` to reload data

### 2. Add `generateSOV` function to `useContractSOV.ts`

Add a new function that:
- Takes a `contractId`
- Calls `supabase.functions.invoke('generate-sov', { body: { project_id, contract_id } })` (or fetch with auth token)
- Handles errors (rate limit, payment required, etc.)
- Calls `fetchData()` on success
- Shows toast on success/failure

### 3. Update the empty-state UI

Replace the current confirmation dialog approach with:
```
[Sparkles icon] Generate SOV (AI-powered)
  — calls generate-sov edge function for each contract
— or —
[Upload icon] Upload Your SOV
```

The generate button iterates over `contracts` and calls the edge function for each one sequentially, showing progress.

### 4. Add "Regenerate" option to existing SOV cards

In the SOV card header (when SOV already exists and is not locked), add a `RefreshCw` icon button to regenerate using the edge function, similar to the description regenerate pattern.

### Files Changed
- `src/hooks/useContractSOV.ts` — add `generateSOV` function
- `src/components/sov/ContractSOVEditor.tsx` — replace template button with AI generate, add regenerate to existing SOVs

