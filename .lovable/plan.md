# Fix: CO Photos Not Saving — RLS Argument Order Bug

## Root Cause

The `is_project_participant(_user_id, _project_id)` function expects `user_id` as the first argument and `project_id` as the second. However, several RLS policies call it with **swapped arguments**: `is_project_participant(project_id, auth.uid())` — passing `project_id` where `user_id` should be and vice versa.

This causes the function to always return `false`, blocking all inserts/selects for those tables.

The storage upload succeeds (200), but the subsequent `INSERT INTO co_photos` fails with **403 RLS violation**.

## Fix

One migration to drop and recreate all affected policies with the correct argument order:

**Affected tables and policies:**
| Table | Policy | Command |
|-------|--------|---------|
| `co_photos` | Participants can view CO photos | SELECT |
| `co_photos` | Participants can insert CO photos | INSERT |
| `co_evidence` | Participants can view CO evidence | SELECT |
| `co_evidence` | Participants can insert CO evidence | INSERT |
| `backcharges` | Project participants can view backcharges | SELECT |
| `backcharges` | Authenticated users can create backcharges | INSERT |
| `backcharges` | Project participants can update backcharges | UPDATE |
| `rfis` | Project participants can view rfis | SELECT |
| `rfis` | Project participants can create rfis | INSERT |
| `rfis` | Submitter or recipient org can update rfis | UPDATE |
| `rfi_attachments` | RFI participants can view attachments | SELECT |
| `rfi_attachments` | Authenticated users can add attachments | INSERT |
| `co_external_invites` | Project participants can view co_external_invites | SELECT |
| `co_external_invites` | Project participants can create co_external_invites | INSERT |

Each policy will be dropped and recreated with `is_project_participant(auth.uid(), ...)` instead of `is_project_participant(..., auth.uid())`.

## Technical Details

- Single SQL migration
- No schema changes, no code changes — purely RLS policy corrections
- No downtime; policies are replaced atomically
