

# Scope & Details Tab — Landing Page

## What changes

Replace the current redirect behavior of the "Scope & Details" tab with an actual in-project tab page that renders inside ProjectHome.

### Two states:

**State A — Not set up yet**
- Sticky bar at top with amber "Setup Project Scope & Details" button → navigates to `/project/:id/details-wizard`
- Empty state message below: "No project profile configured yet"

**State B — Setup complete** (project_profile.is_complete = true)
- Summary cards showing:
  - **Project Profile**: type, stories, units, buildings, foundation, roof, features (pills)
  - **Scope Summary**: X of Y sections active, total items ON, list of active sections with item counts
  - **Contract Summary**: contract value, retainage %, team member assignments
- "Edit Profile" and "Edit Scope" buttons to re-enter the wizards

### Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Stop redirecting on `scope-details` tab — render it inline like other tabs. Add `ScopeDetailsTab` component (or import). Fetch profile/scope/contract data. |
| `src/components/project/ScopeDetailsTab.tsx` | New — the tab content. Shows sticky setup bar (state A) or summary (state B). Uses existing `useProjectProfile` and `useScopeWizard` hooks for data. |
| `src/components/project/index.ts` | Export new component |
| `src/components/layout/BottomNav.tsx` | Remove the special-case redirect for `scope-details` — let it behave like a normal tab |

### Data fetching
- `useProjectProfile(projectId)` — already exists, returns profile + project type
- `useScopeSelections(projectId)` from `useScopeWizard` — already exists, returns active selections
- Query `project_contracts` for contract sum — simple inline query

### Summary layout
- Profile card: project type badge, stories, units/buildings (if applicable), foundation chips, roof chip, feature pills (green for ON)
- Scope card: "X sections active · Y items ON" header, collapsible list of sections with counts
- Contract card: total contract value, retainage %, per-team-member breakdown if available
- Each card has an "Edit" ghost button linking to the relevant wizard page

