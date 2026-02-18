

# AI-Generated Scope of Work Description

## What Changes

Add an AI-generated essential scope of work description that appears in the Scope tile on the project overview page. The AI takes all the structured scope data (floors, foundation, siding, roofing, inclusions, etc.) and produces a concise, professional paragraph summarizing the framing scope of work. This description is stored in the database so it only needs to be generated once (and can be regenerated when scope changes).

## How It Works

1. User configures project scope details (floors, foundation, siding, etc.)
2. A "Generate Description" button appears in the Scope tile on the overview page
3. AI reads all scope fields and produces a 2-3 sentence essential scope summary
4. The description is saved to the database and displayed in the Scope tile
5. User can regenerate if scope changes

## Technical Changes

### 1. Database Migration

Add a `scope_description` text column to `project_scope_details`:

```sql
ALTER TABLE public.project_scope_details
ADD COLUMN IF NOT EXISTS scope_description text;
```

### 2. New Edge Function: `generate-scope-description`

**File:** `supabase/functions/generate-scope-description/index.ts`

- Accepts `project_id` in the request body
- Fetches the full `project_scope_details` row and project name from the database
- Builds a structured prompt with all scope fields (home type, floors, foundation, roof, siding, balconies, decking, inclusions, etc.)
- Calls Lovable AI (`google/gemini-3-flash-preview`) with a system prompt for construction scope writing
- Returns the generated description
- Handles 429/402 rate limit errors

The system prompt will instruct the AI to write a concise (2-3 sentence) essential scope of work description for a framing contractor, covering structure type, key features, and scope inclusions.

### 3. Update `config.toml`

Add entry for the new function:
```toml
[functions.generate-scope-description]
verify_jwt = false
```

### 4. Update Scope Tile in `OperationalSummary.tsx`

In the Scope Summary tile (lines 221-240):

- Fetch `scope_description` alongside existing scope fields
- Display the AI description text below the summary line (e.g., "Single Family Home -- 2 floors")
- Add a "Generate" button (sparkle icon) that calls the edge function
- Show a loading spinner while generating
- After generation, save the description to `project_scope_details` and display it
- If description already exists, show it with a small "Regenerate" button

### 5. Update `ProjectScopeSection.tsx`

In the collapsed header subtitle (line 218), show the AI description instead of or alongside the basic summary stats when available. This gives users a richer preview without expanding.

### Files Modified

1. **New:** `supabase/functions/generate-scope-description/index.ts` -- Edge function calling Lovable AI
2. **Edit:** `supabase/config.toml` -- Register new function
3. **Edit:** `src/components/project/OperationalSummary.tsx` -- Display description in scope tile with generate button
4. **Edit:** `src/components/project/ProjectScopeSection.tsx` -- Show description in collapsed header

### UI Behavior

- **No description yet + scope exists:** Show "Generate" button with sparkle icon
- **Generating:** Button shows spinner, disabled
- **Description exists:** Show the text, with a small "Regenerate" link
- **No scope configured:** Show "No scope configured" as today (no generate button)
- **Error (429/402):** Toast with appropriate message

