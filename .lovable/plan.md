

# Fix: PDF Parsing Fails Due to Truncated AI Response

## Problem Identified

The AI response is being **truncated** because it exceeds the token limit. The PDF contains many line items across multiple sections (Basement, Garden Level Framing, 1st Floor Framing, etc.), and the current `max_tokens: 8000` setting is insufficient.

Evidence from logs:
```json
{
  "pack_name": "1st Floor Framing & Sub-Floor Sheeting",
  "description": "MIT11.88",
  "quantity": 4,
  "uom": "EA",
  "supplier_sku": "zz_NSBLDMT_99687",
....[truncated]
```

The JSON is cut off mid-object, so it never closes with `}]}` and the closing ` ``` ` markdown fence. This means:
1. The regex for extracting JSON from markdown fails (no closing fence found)
2. Even if it matched, `JSON.parse()` would fail on incomplete JSON

## Solution

### 1. Increase Token Limit (Primary Fix)
Increase `max_tokens` from 8000 to 32000 or higher to accommodate large estimates with many items.

### 2. Add Truncation Detection (Safety Net)
Check if the AI response appears truncated and return a helpful error message to the user.

### 3. Improve Regex Fallback (Defense in Depth)
If the closing fence is missing, try to repair the JSON by:
- Detecting incomplete JSON structure
- Closing any open arrays/objects
- Or at minimum, inform the user that the PDF is too large

---

## Implementation

### File: `supabase/functions/parse-estimate-pdf/index.ts`

**Change 1: Increase Token Limit (line 159)**
```typescript
// Before
max_tokens: 8000,

// After
max_tokens: 32000,
```

**Change 2: Add Truncation Detection (after line 185)**
```typescript
const content = aiResponse.choices?.[0]?.message?.content?.trim();

// Check if response appears truncated (no closing markdown fence or JSON bracket)
const finishReason = aiResponse.choices?.[0]?.finish_reason;
if (finishReason === 'length') {
  console.error("AI response was truncated due to token limit");
  throw new Error("The PDF contains too many items. Please split into smaller sections or contact support.");
}
```

**Change 3: Add JSON Repair Attempt (in catch block around line 217)**
```typescript
// Before throwing, try to repair truncated JSON
if (!jsonStr.endsWith('}')) {
  console.log("Attempting to repair truncated JSON");
  // Find last complete item by looking for last complete object
  const lastCompleteItem = jsonStr.lastIndexOf('},');
  if (lastCompleteItem > 0) {
    jsonStr = jsonStr.substring(0, lastCompleteItem + 1) + ']}';
    console.log("Repaired JSON, attempting parse again");
    try {
      parsed = JSON.parse(jsonStr);
      // Continue with partial results
    } catch {
      // Still failed, throw original error
    }
  }
}
```

---

## Summary

| Change | Purpose |
|--------|---------|
| Increase `max_tokens` to 32000 | Allow large PDFs with many items to be fully processed |
| Detect `finish_reason: 'length'` | Provide user-friendly error when response is truncated |
| JSON repair attempt | Salvage partial results from truncated responses |

After these changes:
- Most PDFs will parse completely (32K tokens is enough for 200+ line items)
- If still truncated, user gets clear feedback instead of cryptic error
- Partially parsed results can be salvaged in edge cases

