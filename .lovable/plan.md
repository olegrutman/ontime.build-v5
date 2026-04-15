

# Fix: AI Scope Description — Read Actual Location & Scope Items

## Problem
The AI description generator ignores location and scope items selected by the user:
1. **Location hardcoded** to `{ inside_outside: 'inside' }` in both wizards — the actual `data.locationTag` (e.g., "2nd Floor, Unit 3B, Bathroom") is never sent
2. **Scope items buried** under `structural_element` field — the AI doesn't know these are the selected work items
3. **Reason not passed** in CO wizard (only sent for `fixing` work type)
4. **Prompt too loose** — 150 words, 4 open-ended bullets → model fills space with invented details

## Changes

### 1. Edge function: `supabase/functions/generate-work-order-description/index.ts`
- Add `selected_items: string[]` and `reason_code: string` to `GenerateRequest` interface
- Include `selected_items` and `reason_code` in `contextParts` when provided
- Pass `data.locationTag` as a new `location_tag` string field (alongside existing `location` object for backward compat)
- Use `location_tag` preferentially in context: `Location: ${body.location_tag || buildLocationDescription(body.location)}`
- **Rewrite the system prompt** to be strict and concise:
  ```
  You are a construction scope writer. Output ONLY a 1-3 sentence description.
  State the selected scope items, the exact location provided, and the reason if given.
  Do NOT add details, assumptions, or recommendations not present in the input.
  Do NOT mention pricing, scheduling, or general construction advice.
  ```
- **Simplify the user prompt** — just dump the context, no "Write a professional description that clearly communicates…" bullets
- Lower `temperature` from `0.7` to `0.3` and `max_tokens` from `500` to `200`

### 2. `src/components/change-orders/wizard/COWizard.tsx` — `generateAIDescription()`
- Send `location_tag: data.locationTag` instead of `location: { inside_outside: 'inside' }`
- Send `selected_items: data.selectedItems.map(i => i.item_name)` as a proper array
- Send `reason_code: data.reason` (always, not just for fixing)
- Keep `structural_element` for backward compat but de-prioritize

### 3. `src/components/change-orders/wizard/TMWOWizard.tsx` — `generateAIDescription()`
- Same fixes: send `location_tag: data.locationTag`, `selected_items`, and `reason_code: data.workType`

### 4. Memory: save rule about AI description generation style
- "AI scope descriptions must be 1-3 sentences, strictly derived from selected items and location. No invented details."

## Result
Before: "Perform re-framing work at the interior location. This includes header installation, partition wall framing, and associated structural modifications to accommodate the new layout. Coordinate with the general contractor regarding material procurement…" (hallucinated)

After: "Reframe existing wall and install header at 2nd Floor, Unit 3B, Bathroom. Addition — new partition wall framing included." (factual)

