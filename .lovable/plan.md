

# Expand Backout Plan with Sub-Items

## What
Currently backout is a single toggle. In reality, backout includes multiple distinct work items: blocking (TV, cabinet, handrail, etc.), shimming, stud replacement, and more. Expand the backout section so users can specify which backout tasks are included, with blocking as a key sub-item.

## Changes

### 1. Database Migration — add backout detail columns to `project_profiles`

New columns:
- `scope_backout_blocking` boolean default true — general blocking (TV mounts, cabinets, handrails, grab bars)
- `scope_backout_blocking_items` text[] default '{}' — specific blocking types selected
- `scope_backout_shimming` boolean default true — shimming doors/windows
- `scope_backout_stud_repair` boolean default true — stud replacement/straightening
- `scope_backout_nailer_plates` boolean default true — nail plates on notched/drilled studs
- `scope_backout_pickup_framing` boolean default true — misc pickup framing/patching

Remove `scope_interior_blocking` (it's now covered by `scope_backout_blocking`).

### 2. Update `src/types/projectProfile.ts`

- Add new fields to `ProjectProfile` interface
- Add `BACKOUT_BLOCKING_OPTIONS` constant:
  `['TV Mounts', 'Cabinet Blocking', 'Handrail Blocking', 'Grab Bar Blocking', 'Shelf Blocking', 'Medicine Cabinet', 'Tub/Shower Blocking', 'Specialty Blocking']`
- Update `getSmartDefaults()` — when backout is on, all sub-items default true; blocking items default to common ones per project type (e.g., custom homes get TV + Cabinet + Handrail; apartments add Grab Bar + Tub/Shower)

### 3. Update `src/pages/ProjectDetailsWizard.tsx` — Scope step

Replace the single backout toggle with an expanded section:

```
FieldSection "Backout Plan"
  └─ Switch: Backout included (master toggle)
  └─ When ON, show sub-items:
     ├─ Switch: Blocking → when ON, show chip multi-select for blocking types
     ├─ Switch: Shimming (doors & windows)
     ├─ Switch: Stud Repair / Straightening
     ├─ Switch: Nailer Plates
     └─ Switch: Pickup Framing & Patching
```

### 4. Update `DetailsSummaryPanel.tsx`

Show "Backout" with count of sub-items when enabled.

### 5. Update Review step & description generator

- Review step: list backout sub-items under "Backout Plan" section
- `generate-project-description` edge function: include backout detail in scope lines

### Files Changed
- `supabase/migrations/` — new columns
- `src/types/projectProfile.ts` — fields + constants + defaults
- `src/pages/ProjectDetailsWizard.tsx` — expanded backout UI
- `src/components/project-wizard-new/DetailsSummaryPanel.tsx` — backout detail
- `supabase/functions/generate-project-description/index.ts` — backout in prompt

