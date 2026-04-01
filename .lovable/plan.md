

# AI-Generated Framing Scope Summary

## What
Add an AI-generated plain-English summary paragraph to the completed framing scope view. Instead of just showing checkmarks, the system will call an edge function that reads the framing scope answers and produces a professional, easy-to-read narrative describing what's included and excluded.

## Approach

### 1. Create new edge function: `generate-framing-scope-summary`
Follows the same pattern as the existing `generate-scope-description` function:
- Accepts `project_id`
- Reads `project_framing_scope.answers` + `projects.name` + `project_profiles` for building type
- Converts the JSON answers into structured text (method, features, steel, sheathing, siding, openings, blocking, fire, hardware, cleanup)
- Calls Lovable AI (Gemini 2.5 Flash) with a construction-specific system prompt:
  - "Write a clear, professional 4-6 sentence scope summary for a framing subcontract. Cover framing method, material responsibility, what structural features are included, exterior skin scope, openings approach, and any notable exclusions. Use plain English a field superintendent would understand. No bullet points."
- Saves result to `project_framing_scope.ai_summary` (new JSONB column)
- Returns the summary text

### 2. DB migration
Add `ai_summary text` column to `project_framing_scope` table.

### 3. Update `ScopeSummaryPanel.tsx`
- Add optional `aiSummary` and `onGenerateSummary` props
- When in compact mode (embedded completed view), show the AI summary paragraph above the checklist grid
- Add a "Generate Summary" / "Regenerate" button (sparkle icon)
- Loading state while generating

### 4. Update `FramingScopeWizard.tsx`
- In the completed/embedded view (line 154-190), fetch `ai_summary` from the DB row
- Wire up the generate button to call the edge function
- Pass `aiSummary` and handler to `ScopeSummaryPanel`

## Layout (compact completed view)
```text
┌─────────────────────────────────────────────────┐
│ ✓ Framing Scope Complete     11 included  ...   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ AI Summary                    ✨ Regenerate │ │
│ │ "This panelized framing subcontract covers  │ │
│ │  labor-only installation of..."             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ FRAMING METHOD    BUILDING FEATURES   EXT SKIN  │
│ ✓ Panelized       ✓ Wood stairs      ✓ Wall... │
│ ✓ Labor only      ✓ Tuck-under       ✓ Roof... │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

## Files Modified
| File | Change |
|------|--------|
| `supabase/functions/generate-framing-scope-summary/index.ts` | **New** — edge function |
| DB migration | Add `ai_summary text` to `project_framing_scope` |
| `src/components/framing-scope/ScopeSummaryPanel.tsx` | Add AI summary display + generate button |
| `src/components/framing-scope/FramingScopeWizard.tsx` | Wire up AI summary fetch and generation |

