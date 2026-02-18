
# Add AI-Generated Scope Description to Edit Scope Page

## What Changes

Add a card at the top of the Edit Scope page that displays the AI-generated scope description and provides a "Generate" / "Regenerate" button, reusing the same `generate-scope-description` edge function already built.

## Technical Changes

### `src/pages/EditProjectScope.tsx`

1. **Add state variables:**
   - `scopeDescription` (string) -- loaded from `project_scope_details.scope_description` during initial fetch
   - `generatingDescription` (boolean) -- loading state for the AI call

2. **Update initial data fetch** (around line 158-169): Also capture `scope_description` from the fetched `scopeData`.

3. **Add `handleGenerateDescription` function:** Calls `supabase.functions.invoke('generate-scope-description', { body: { project_id } })`, updates `scopeDescription` state, and shows toast on success/error.

4. **Add new imports:** `Sparkles`, `RefreshCw` from `lucide-react`; `Alert`, `AlertDescription` from UI components.

5. **Add a "Scope Description" card** right after the header (before the grid, around line 313): A full-width card showing:
   - If description exists: the description text with a "Regenerate" button (RefreshCw icon)
   - If no description: a prompt to generate with a "Generate Description" button (Sparkles icon)
   - While generating: a spinner with disabled button
   - The card uses a subtle background to distinguish it from the form fields

### No other files changed

The edge function and database column already exist. This is purely a UI addition to the edit page.

### UI Layout

```text
[Back] Edit Scope & Project Details          [Save Changes]

+-------------------------------------------------------+
| Scope Description                    [Generate/Regen]  |
| "Framing scope includes a 2-story custom home on      |
|  slab foundation with gable roof..."                   |
+-------------------------------------------------------+

[Structure]          [Stairs & Elevator]
[Roof]               [Exterior Features]
...
```
