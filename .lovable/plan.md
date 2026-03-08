

# Enhance Platform Project Detail — Full Address + Created By

## Current State
The page already shows: team members table, contracts table, financial overview, activity breakdown, invoices, POs, and city/state in summary. Two things are missing:

1. **Full address** — only city/state is displayed; street and zip are available in `project.address` but not shown
2. **Created By** — `project.created_by` (a user ID) is fetched but never displayed; need to resolve it to a name

## Changes — `src/pages/platform/PlatformProjectDetail.tsx`

### 1. Show full address in Summary Card
Replace the Location field (currently just city/state) with the full address: street, city, state, zip — each on its own line or comma-separated. Falls back to "—" if no address.

### 2. Resolve and show "Created By"
- In `fetchData`, add a query to `profiles` table using `project.created_by` to get `first_name`, `last_name`, `email`
- Add a "Created By" field to the Summary Card showing the user's name (linked to `/platform/users/:id`) with email as secondary text
- If `created_by` is null, show "—"

### 3. Add org type badge to Team table
Currently the team table shows org name and role. Add the organization `type` (GC/TC/FC) as a small badge next to the org name for quick identification.

### Summary of UI additions to Summary Card
Current 5 columns: Status, Owner Org, Location, Created, Contracts
New layout (6 columns): Status, Owner Org, Created By, Location (full address), Created Date, Contracts

Single file edit: `src/pages/platform/PlatformProjectDetail.tsx`

