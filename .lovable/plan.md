

# Improve Project Description Generation

## What
Update the `generate-project-description` edge function to include all new building structure fields (framing, floor/roof systems, garage car count) and all scope fields (windows, siding, exterior trim, WRB, backout, extras, etc.) in the AI prompt. Also improve the system prompt to produce a short "project brief" style message that communicates to all parties what the job includes.

## Changes

### 1. Update `supabase/functions/generate-project-description/index.ts`

**Expand the context builder** to include all new profile fields:

- **Structure**: framing system, floor system, roof system, structure type, corridors, entry type, special rooms, stories per unit, garage car count
- **Scope inclusions**: windows (+ type), patio doors (+ type), siding (+ type + level), exterior trim (+ type), soffit/fascia (+ types), WRB (+ type), sheathing, backout plan, decks/railings (+ type), garage framing (+ trim openings), interior blocking, fire stopping, stairs, curtain wall, storefront framing, extras array
- **Scope exclusions**: list what is NOT included (e.g., "Windows: Not included", "Siding: Not included") so the AI can mention it

**Improve the system prompt** to something like:
> "You are a construction project describer. Write a concise 3-4 sentence project brief that summarizes: (1) the building type, scale, and location, (2) the structural systems (framing, floor, roof), (3) what work is included in this project's scope (siding, windows, trim, etc.), and (4) any notable extras or exclusions. Write in professional construction language as if briefing all project stakeholders. Output only the description."

Increase `max_tokens` to 500 to accommodate the longer output.

### Files Changed
- `supabase/functions/generate-project-description/index.ts` — expanded context + improved prompt

