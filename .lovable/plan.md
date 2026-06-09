# Re-run Setup Wizard Action

Add a one-click way to restart the project setup wizard from Project Home, without manual DB edits.

## UX

- On `ProjectHome.tsx`, add a "Re-run setup" button in the project header overflow menu (kebab) next to existing actions.
- Also expose it inside the "Finish setup" banner as a secondary link ("Start over") so users mid-setup can reset.
- Clicking opens a confirm dialog:
  - Title: "Re-run setup wizard?"
  - Body: "This clears your setup answers and reopens the wizard. Existing contracts, team, and SOV will be preserved unless you change them in the wizard."
  - Buttons: Cancel / Re-run

## Behavior

On confirm:
1. Call new RPC `public.reset_project_setup(p_project_id uuid)` (SECURITY DEFINER):
   - Verify caller is an ACCEPTED GC or TC participant of the project (via `is_project_participant`).
   - `DELETE FROM project_setup_answers WHERE project_id = p_project_id`.
   - `UPDATE projects SET setup_completion_required = true WHERE id = p_project_id`.
   - Return void.
   - `GRANT EXECUTE ... TO authenticated`.
2. On success: invalidate `['project', id]`, `['project_basic', id]`, `['setup_answers', id]` query keys.
3. Navigate to `/project/:id/finish-setup` (existing route used by the banner).
4. Toast: "Setup wizard reset — answer the questions to regenerate your scope."

## Scope guardrails

- Do NOT delete `project_contracts`, `project_sov`, `project_sov_items`, team invites, or participants. The wizard's finish step already upserts contracts and only seeds SOV when missing per the existing `saveSovOnly` path (separate in-flight work).
- Only the setup answers + the `setup_completion_required` flag are reset.

## Files

- `supabase/migrations/<new>.sql` — create `reset_project_setup` function + grant.
- `src/pages/ProjectHome.tsx` — add menu item + dialog wiring, navigate to finish-setup.
- `src/components/project/ResetSetupDialog.tsx` (new) — small confirm dialog calling the RPC and handling invalidation/toast/navigation.

## Out of scope

- Changes to the wizard itself or to contract/SOV seeding logic (tracked separately).
