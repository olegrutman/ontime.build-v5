

# Enhance Scope & Details Page

## Changes

### 1. Project Profile Card — add address + AI description
**File: `src/components/project/ScopeDetailsTab.tsx`**

- Fetch full project data (`address`, `city`, `state`, `zip`, `description`) from `projects` table (expand the existing `projectInfo` query to `select('*')`)
- Display the address below the project type badges (format: `street, city, state zip` from the jsonb `address` field + `city`/`state`/`zip` columns)
- Show `description` below address in muted text; if no description exists, show a "Generate Description" button that calls an AI edge function to create a short project summary based on the profile data (type, stories, features, scope) and saves it back to the `projects` table

### 2. Contract Summary Cards — use company names
**File: `src/components/project/ScopeDetailsTab.tsx`**

- Update the contracts query to join org names: `from_org:organizations!project_contracts_from_org_id_fkey(id, name), to_org:organizations!project_contracts_to_org_id_fkey(id, name)` (same pattern used in `ProjectSOVPage.tsx`)
- Replace the single "Contract Summary" card with individual cards per contract, each showing:
  - **Company name** as the primary identifier (e.g., "Apex Builders Inc")
  - Role as a small secondary badge (e.g., `GC`, `FC`)
  - Contract value + retainage
- All contract cards use the same card shell styling for visual consistency

### 3. Scope Split → part of Downstream Contracts
**File: `src/components/project/ScopeDetailsTab.tsx`**

- Remove the standalone `<ScopeSplitCard>` rendering
- Move the scope split trigger **inside** `DownstreamContractsCard` as a secondary action
- **File: `src/components/project/DownstreamContractsCard.tsx`**:
  - Accept new props: `fcOrgs`, `projectId` for scope split (already has `projectId`)
  - Add a "Split Scope" button in the card header or below the contract inputs
  - Import and render `ScopeSplitCard`'s dialog logic inline, or render `ScopeSplitCard` as a child within the downstream contracts card
  - This groups downstream contract values + scope assignments together as one logical unit

### 4. Edge function for AI description
- Create `supabase/functions/generate-project-description/index.ts`
- Takes `projectId`, reads project profile + scope data, calls Lovable AI (gemini-2.5-flash) to generate a 1-2 sentence project description
- Saves result to `projects.description`

## Summary
- Project Profile card gets richer with address + AI-generated description
- Contract cards show company names as primary identifiers with consistent styling
- Scope Split merges into the Downstream Contracts card as a unified section

