

# Project Details Wizard + Scope Wizard + Contract Page

## Overview

Build the three-wizard chain: **Details Wizard** (4 pages + review) → **Scope Wizard** (toggle items ON/OFF) → **Contracts page** (assign contract sum). The Details Wizard writes a `project_profile` that filters everything downstream.

## Database Migration

### 5 new tables + seed data

**1. `project_types`** — 6 seeded rows (apartment, townhome, custom_home, production_home, commercial, mixed_use) with flags and defaults. RLS: all authenticated can SELECT.

**2. `project_profiles`** — One per project. FK to projects + project_types. Stores stories, units, buildings, foundation_types (text[]), roof_type, 9 boolean feature flags, sub-selections (garage_types[], basement_type, stair_types[]), is_complete. RLS: project participants can SELECT; project creator can INSERT/UPDATE.

**3. `scope_sections`** — 17 seeded rows. slug, label, display_order, always_visible, required_feature, description. RLS: all authenticated can SELECT.

**4. `scope_items`** — ~130 seeded rows. FK to scope_sections. label, item_type (STD/OPT), default_on, required_feature, excluded_project_types[], only_project_types[], display_order. RLS: all authenticated can SELECT.

**5. `project_scope_selections`** — Per-project per-item toggle state. FK to projects, project_profiles, scope_items. is_on, is_new, is_conflict. RLS: project participants can SELECT; project creator can INSERT/UPDATE/DELETE.

One large migration with all CREATE TABLEs, RLS policies, and INSERT seeds for project_types (6 rows), scope_sections (17 rows), and scope_items (~130 rows).

## Routes

| Route | Component |
|-------|-----------|
| `/project/:id/details-wizard` | `ProjectDetailsWizard` |
| `/project/:id/scope-wizard` | `ProjectScopeWizard` |
| `/project/:id/contracts` | `ProjectContractsPage` |

Add all three to `App.tsx` as protected routes.

## Project Details Wizard — `src/pages/ProjectDetailsWizard.tsx`

### State
- `currentStep` (0-4)
- `profile` state object matching `project_profiles` columns
- `projectTypes` fetched from `project_types` table on mount

### Page 1 — Project Type (step 0)
- Fetch `project_types`, render 6 cards in 3-col grid (2-col mobile)
- On select: apply smart defaults to profile state, show amber confirmation chip
- Icons: Building2 (apartment), Home (townhome), Castle (custom), Factory (production), Store (commercial), Layers (mixed-use)

### Page 2 — Structure (step 1)
- Stories number input (always shown)
- Units per building (shown if is_multifamily or mixed_use)
- Number of buildings (shown if apartment or production_home)
- Foundation type multi-select chips
- Roof type single-select chips

### Page 3 — Building Details (step 2)
- Toggle + expand rows for Garage, Basement, Stairs
- Each expand shows chip selectors with smooth animation (Collapsible)

### Page 4 — Features (step 3)
- Toggle rows: Decks/balconies, Pool, Elevator (apartment/commercial/mixed_use only), Clubhouse (apartment/mixed_use only), Commercial spaces (mixed_use only), Shed

### Review (step 4)
- Panel 1: Profile summary with pill tags
- Panel 2: Scope sections with green/amber/gray dots (query scope_sections + scope_items to compute)
- "Save Profile & Open Scope Wizard" button → upsert project_profiles with is_complete=true → navigate to `/project/:id/scope-wizard`

### Shared UI
- Sticky progress bar (5 steps): Project Type, Structure, Building Details, Features, Review
- Navy/amber brand tokens
- 44px min touch targets
- Back/Next sticky footer

## Scope Wizard — `src/pages/ProjectScopeWizard.tsx`

### Data loading
1. Fetch `project_profiles` for this project (redirect to details wizard if missing/incomplete)
2. Fetch `project_types` to get the slug
3. Fetch `scope_sections` — filter: `always_visible = true OR required_feature IS NULL OR profile[required_feature] = true`
4. Fetch `scope_items` — filter per section using required_feature, excluded_project_types, only_project_types, and stories count
5. Fetch existing `project_scope_selections` if any (for re-edit)

### Layout
- Collapsed profile banner at top (expand to see full profile, "Edit Profile" link)
- Accordion/collapsible sections — each scope section is a card
- Each item is a toggle row (label + STD/OPT badge)
- STD items default ON, OPT items default OFF (unless existing selections override)
- Conflict banner if `is_conflict` items exist
- "New" amber badge on `is_new` items

### Save
- Upsert all `project_scope_selections` (one row per visible item with the user's toggle state)
- Navigate to `/project/:id/contracts`

## Contracts Page — `src/pages/ProjectContractsPage.tsx`

- Lists all project team members (from `project_team`)
- For each team member, shows their scope sections (based on scope selections)
- Input field for contract sum per team member
- Saves to `project_contracts` table (already exists)
- Simplified first version — can be enhanced later into a full Contract Wizard

## Hook: `useProjectProfile.ts`

Fetches + caches project_profile, project_type, and provides helper to check feature flags.

## Hook: `useScopeWizard.ts`

Fetches sections + items, applies profile filters, manages toggle state, handles save + conflict detection.

## Types: `src/types/projectProfile.ts`

TypeScript interfaces for ProjectProfile, ScopeSection, ScopeItem, ScopeSelection, ProjectType (seed type).

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | CREATE 5 tables + seed project_types, scope_sections, scope_items (~130 items) |
| `src/types/projectProfile.ts` | New — all TS interfaces |
| `src/hooks/useProjectProfile.ts` | New — fetch/save profile |
| `src/hooks/useScopeWizard.ts` | New — scope filtering + toggle state |
| `src/pages/ProjectDetailsWizard.tsx` | New — 4-page + review wizard |
| `src/pages/ProjectScopeWizard.tsx` | New — scope toggle wizard |
| `src/pages/ProjectContractsPage.tsx` | New — contract sum entry |
| `src/App.tsx` | Add 3 routes |
| `src/pages/ProjectHome.tsx` | Add entry point button/card to launch the wizard chain |

