

# Fix: Project Creation "status check" Error

## Problem
When a Trade Contractor tries to create a new project, the save fails with:
> "new row for relation 'projects' violates check constraint 'projects_status_check'"

The `projects` table only allows these status values: `draft`, `active`, `on_hold`, `completed`, `archived`. However, the project creation wizard (`CreateProjectNew.tsx`) inserts new projects with `status: 'setup'`, which is not in the allowed list.

## Solution
Add `'setup'` to the allowed values in the `projects_status_check` constraint via a database migration.

## Changes

### 1. Database Migration
- Drop the existing `projects_status_check` constraint
- Re-create it with `'setup'` added to the allowed values: `draft`, `setup`, `active`, `on_hold`, `completed`, `archived`

### 2. No frontend changes needed
The wizard code is correct in its intent -- `setup` is the right initial status for a project being built through the wizard. The constraint just needs to be updated to allow it.

