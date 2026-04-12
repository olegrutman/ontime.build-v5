

# Fix T&M Project: Scope Not Saved + Summary Not Showing Building Info

## Problems Found

1. **Scope details insert silently fails** — The `project_scope_details` insert on project creation has no error handling. If it fails (e.g., RLS timing, data type mismatch), the error is swallowed and the user never knows. The DB confirms: zero rows exist for this project.

2. **ProjectInfoSummary ignores building info for T&M** — The summary component only queries `project_setup_answers` and `project_contracts`, which are empty for T&M projects. It never reads `project_scope_details`, so even if the data were saved correctly, it wouldn't show.

## Fixes

### 1. `src/pages/CreateProjectNew.tsx` — Add error handling to scope insert
- Add `.select()` and check for errors on the `project_scope_details` insert (line 182)
- Wrap `siding_materials` with `JSON.stringify()` or ensure it's sent as proper JSONB
- If the insert fails, show a toast warning (non-blocking — project is already created)
- Also add `material_responsibility` to the scope insert from `tmScope.materialResponsibility`

### 2. `src/components/project-setup/ProjectInfoSummary.tsx` — Show building info for T&M
- Add a new query to fetch `project_scope_details` for the project
- Add a "Building Info" section that renders when scope data exists, showing:
  - Building type (home_type)
  - Stories/floors
  - Foundation type + basement details
  - Garage type
  - Siding (yes/no + materials)
  - Material responsibility
  - Total sqft (if set)
- This section appears between "Project Details" and "Team" (since T&M has no contracts or scope answers)

### 3. No database changes needed
- The `project_scope_details` table already has all needed columns
- RLS policies already allow the project creator to insert

## Result
After the fix, creating a T&M project will reliably save building info, and the Project Info page will display it in a clean summary card.

