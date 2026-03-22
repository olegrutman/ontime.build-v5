

# Build SOV Full Page

## Summary

Create a dedicated SOV page at `/project/:id/sov` that reads from project_profiles, project_scope_selections, and project_contracts. The project creator (GC or TC — whoever created the project) can generate, edit, lock, and manage the SOV. Non-creators on the team can view only. FC has no access.

## Database Migration

### Alter `project_sov`
Add columns:
- `project_profile_id` (uuid, nullable, FK → project_profiles)
- `contract_id` — already exists
- `scope_snapshot` (jsonb, nullable)
- `version` (int, default 1)
- `previous_version_id` (uuid, nullable, self-ref FK)

### Alter `project_sov_items`
Add columns:
- `scope_section_slug` (text, nullable) — maps line to scope section
- `is_locked` (bool, default false) — per-line lock for redistribution
- `ai_original_pct` (numeric, nullable) — stores AI-generated % for reset
- `billing_status` (text, default 'unbilled') — 'unbilled' | 'partial' | 'paid'
- `remaining_amount` (numeric 12,2, default 0)

### New table: `sov_invoice_lines`
- id (uuid, pk)
- sov_item_id (uuid, FK → project_sov_items ON DELETE CASCADE)
- invoice_id (uuid, FK → invoices ON DELETE CASCADE)
- amount_billed (numeric 12,2, not null)
- created_at (timestamptz, default now())

RLS: project team members can SELECT; project creator can INSERT/UPDATE.

### RLS updates
- `project_sov`: update existing policies to allow project team members (via project_team) rather than org-based checks
- `sov_invoice_lines`: team member SELECT, creator INSERT/UPDATE

## Route + Navigation

### App.tsx
Add route: `/project/:id/sov` → `ProjectSOVPage`

### ProjectTopBar.tsx
Add "SOV" tab between existing tabs (after Contracts, before Invoices)

### ProjectHome.tsx
Handle `tab === 'sov'` → navigate to `/project/:id/sov`

## New Page: `src/pages/ProjectSOVPage.tsx`

Full-page layout with:

### Header strip
- Title "Schedule of Values" (Barlow Condensed)
- Breadcrumb: project name + contract number
- Three-source status bar with green/amber indicators
- "Generate SOV" (amber) + "Lock SOV" (navy) buttons
- Access: creator can edit, non-creator team members view only, FC blocked

### Prerequisite checks
Fetch project_profiles, project_scope_selections (is_on=true count), project_contracts. If any missing, show blocking card with link to fix.

### Two-column layout (desktop)

**Left (65%) — SOV Table**
- Columns: #, Line Item, Group, %, Value ($), Retainage, Net, Lock toggle, Actions
- When locked: add Billed, Remaining, Status columns
- Editable % with proportional redistribution across unlocked lines
- Amber left border + "Reset to AI" on edited lines
- Add/delete/reorder rows
- Total row must equal 100% (±0.05)
- "Global Reset All" button

**Right (35%) — Scope Coverage Panel**
- Per scope section: name, item count, green/amber dot, allocated %
- Coverage score: "X of Y sections covered"
- Warning for uncovered sections

### Generate SOV flow
1. Read profile, scope selections, contract
2. Build AI prompt with all three data sources (system prompt with all rules + user message)
3. Call AI via edge function
4. Parse response → populate table
5. Run scope coverage check

### Versioning
- "Version history" link in header
- Shows version list with: number, date, locked status, line count
- Only current (latest) version is editable
- Regenerate creates new version, preserves old

### Lock flow
1. Set `is_locked = true`, `locked_at`, `locked_by`
2. Write final `percent_of_contract` and `value_amount` to all items
3. SOV becomes billing template (read-only)

## New Hook: `src/hooks/useSOVPage.ts`

- Fetch/cache SOV, items, profile, scope selections, contract
- Generate SOV (calls edge function)
- CRUD items with redistribution logic
- Lock/version management
- Scope coverage computation

## Edge Function: `supabase/functions/generate-sov/index.ts`

- Accepts project_id
- Fetches profile, scope selections, contract from DB
- Builds the full AI prompt (system prompt with all sequencing/weight rules + user message from 3 data sources)
- Calls AI model (gemini-2.5-flash)
- Returns JSON array of SOV lines with: item_name, group, percent, scope_section_slug
- Includes all rules: WRB standalone, backout per floor, siding per elevation (cardinal for multifamily, directional for single family), weight calibrations

## Types: `src/types/sov.ts`

Interfaces for SOVLine (with redistribution state), SOVVersion, ScopeSection coverage, AI response format.

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | ALTER project_sov + project_sov_items, CREATE sov_invoice_lines |
| `supabase/functions/generate-sov/index.ts` | New — AI generation edge function |
| `src/types/sov.ts` | New — TypeScript interfaces |
| `src/hooks/useSOVPage.ts` | New — data fetching, redistribution, versioning |
| `src/pages/ProjectSOVPage.tsx` | New — full page component |
| `src/App.tsx` | Add route |
| `src/components/project/ProjectTopBar.tsx` | Add SOV tab |
| `src/pages/ProjectHome.tsx` | Handle SOV tab navigation |

