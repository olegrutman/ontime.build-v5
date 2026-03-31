

# Consolidate Contract Input to Project Info Page Only

## What's Changing

The contract input in the Project Info page (`PhaseContracts.tsx`) becomes the **single place** to create and edit contract values. All other redundant contract editing UI and standalone pages get removed.

## Audit Results — Places Found

| Location | What it does | Action |
|----------|-------------|--------|
| `PhaseContracts.tsx` (Project Info) | Contract input form | **KEEP — single source** |
| `ProjectContractsPage.tsx` | Standalone `/project/:id/contracts` page — duplicate form | **DELETE file** |
| `ContractHeroCard.tsx` | Inline contract edit on overview hero card | **DELETE file** (dead code — imported but never rendered) |
| `ProjectFinancialsSectionNew.tsx` | Inline contract edit + create in financials section | **DELETE file** (dead code — never rendered) |
| `ProfitCard.tsx` | Inline owner contract editing | **DELETE file** (dead code — never rendered) |
| `ScopeDetailsTab.tsx` | Read-only contract display + "Edit" button → `/contracts` | **Update** — change "Edit" button to navigate to `/project/:id/setup` (scrolls to contracts card) |
| `OverviewContractsSection.tsx` | Read-only contract cards on overview | **KEEP** — read-only display, but update "View SOV" link to navigate to setup page |
| `AddTeamMemberDialog.tsx` | Creates contract rows with `contract_sum: 0` | **KEEP** — this is initialization, not editing |
| `ProjectSOVPage.tsx` | "Set up" button → `/contracts` | **Update** — redirect to `/project/:id/setup` |
| `ProjectScopeWizard.tsx` | Navigates to `/contracts` after save | **Update** — redirect to setup |
| `ContractScopeWizard.tsx` | Navigates to `/contracts` | **Update** — redirect to setup |
| `App.tsx` | Route for `/project/:id/contracts` | **Remove route** |
| `ProjectHome.tsx` | Imports `ContractHeroCard` | **Remove unused import** |

## Changes by File

### Delete Files (dead code)
- `src/pages/ProjectContractsPage.tsx`
- `src/components/project/ContractHeroCard.tsx`
- `src/components/project/ProjectFinancialsSectionNew.tsx`
- `src/components/project/ProfitCard.tsx`

### `src/App.tsx`
- Remove lazy import for `ProjectContractsPage`
- Remove the `/project/:id/contracts` route

### `src/pages/ProjectHome.tsx`
- Remove `ContractHeroCard` import

### `src/components/project/ScopeDetailsTab.tsx`
- Change "Edit" button from `navigate('/project/:id/contracts')` to `navigate('/project/:id/setup')` so it goes to Project Info page

### `src/pages/ProjectSOVPage.tsx`
- Change "Set up" / "Create Contract" buttons from `/contracts` to `/project/:id/setup`

### `src/pages/ProjectScopeWizard.tsx`
- Change post-save navigation from `/contracts` to `/setup`

### `src/pages/ContractScopeWizard.tsx`
- Change navigation references from `/contracts` to `/setup`

### `src/components/sasha/SashaBubble.tsx`
- Update any contract-related navigation to point to setup page

## What's NOT Changed
- `project_contracts` database table — unchanged, still the single DB table
- `AddTeamMemberDialog.tsx` — keeps creating `contract_sum: 0` rows (initialization)
- Invoice system — reads contracts, doesn't edit them
- SOV system — reads contract values, doesn't edit them
- `OverviewContractsSection.tsx` — read-only display stays
- `useProjectFinancials` hook — still reads from `project_contracts`

