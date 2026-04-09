

# Project Info Page — Show Project Summary

## Problem
When a project is created through the new 5-step wizard, the "Project Info" sidebar page either hides the wizard (since SOV already exists) or shows only the SOV editor. There is no summary of what was defined during creation — building type, scope answers, contract values, team, etc.

## Solution
Replace the hidden wizard section with a read-only **Project Summary** view that displays all the data captured during project creation. This summary will pull from `project_setup_answers`, `projects`, `project_contracts`, and `project_members` to reconstruct and display the project's scope and configuration.

## Changes

### 1. Create `src/components/project-setup/ProjectInfoSummary.tsx`
A new read-only summary component that shows:
- **Project basics**: name, address, building type, start date
- **Scope selections**: all setup answers grouped by section (reuse `WizardSummary` formatting logic)
- **Contract overview**: upstream + downstream contract values, material responsibility
- **Team**: list of project members with roles
- Fetches data from `project_setup_answers`, `projects`, `project_contracts`, and `project_members` using existing queries/hooks

### 2. Update `src/components/project-setup/ProjectSetupFlow.tsx`
- When `wizardDone` is true, show `ProjectInfoSummary` above the SOV editor card instead of hiding the wizard section entirely
- Keep the SOV editor card below as-is
- For legacy projects where wizard is still needed, behavior stays unchanged

| File | Change |
|------|--------|
| `src/components/project-setup/ProjectInfoSummary.tsx` | New component: read-only project summary with basics, scope, contracts, team |
| `src/components/project-setup/ProjectSetupFlow.tsx` | Show `ProjectInfoSummary` when `wizardDone` is true instead of hiding the wizard section |

