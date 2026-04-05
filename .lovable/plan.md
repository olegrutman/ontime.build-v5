

# Fix: Seed All Project Data into Setup Answers

## Problem

The seeding logic in `ProjectSetupFlow.tsx` only seeds `name` and `building_type` from the project record. It ignores `address`, `city`, `state`, `zip`, `start_date`, `status`, and `description` -- all of which exist on the project and should pre-populate Phase 1.

Current DB state for project "Test Residence 001":
- `address`: `{"street": "456 Oak Avenue"}`, `city`: Denver, `state`: CO, `zip`: 80202
- `status`: setup
- Only 3 answers seeded: `name`, `building_type`, `building_type_code`

## Fix

### `ProjectSetupFlow.tsx` -- Expand seeding logic (lines 58-79)

Fetch the full project record and seed all Phase 1 fields:

| field_key | Source |
|-----------|--------|
| `name` | `project.name` |
| `building_type` | mapped slug display name (e.g., "Single Family") |
| `address` | Compose from `project.address.street`, `project.city`, `project.state`, `project.zip` |
| `start_date` | `project.start_date` |
| `status` | `project.status` (capitalize) |
| `description` | `project.description` |

The address field uses `input_type: address` which expects `{street, city, state, zip}` -- so assemble that object from the project's separate columns.

Also fix: the `building_type` seed currently stores the slug (`"custom_home"`) but the dropdown options are display names (`"Single Family"`). Need a reverse map to seed the correct display name.

### Additional bug: seeding guard is too aggressive

The seed runs only when `count === 0`. But after first seed, if user deletes an answer and re-enters setup, the remaining fields never get seeded. Change to: seed individual fields only if they don't already have an answer (check existing answer keys, not total count).

### Files changed

| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Fetch project record in seed effect; seed address/status/start_date/description; reverse-map building_type slug to display name; seed per-field instead of all-or-nothing |

