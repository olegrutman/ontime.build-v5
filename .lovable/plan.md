
Problem:
- The current CO model only supports one active outside party via `assigned_to_org_id`.
- That works for GC → TC or FC → TC → GC, but it breaks the case “GC created the CO, TC wants FC help on the same CO.”
- Today there is no TC action for this, and if we simply reassign the CO to FC, the TC loses access because the access model is based on `org_id` or `assigned_to_org_id`.

What I found in the current code:
- `COStatusActions.tsx` only has a special TC action for FC-originated COs: “Approve & send to GC”.
- `StepConfig.tsx` lets a TC choose FC only when the TC is creating a brand new CO.
- `useChangeOrders.ts` and current RLS only treat a CO as visible if your org is the owner or assignee.
- Existing `parent_co_id` is not used anywhere in the UI, so there is no current “linked FC sub-workflow” users can actually use.

Recommended approach:
- Add an “FC collaborator” workflow for the same CO instead of spawning a separate CO by default.
- Keep the CO assigned to the TC, but let the TC invite one FC org to contribute labor/notes/material input on that CO.
- This matches the user request better: FC gets involved on the same CO, and TC keeps control of upstream submission to GC.

Implementation plan:

1. Add a collaborator table in the backend
- Create a new table like `change_order_collaborators` with:
  - `id`
  - `co_id`
  - `organization_id`
  - `collaborator_type` (`FC`)
  - `invited_by_user_id`
  - `status` (`active`, `completed`, `removed`)
  - timestamps
- Reuse `fc_input_needed` on `change_orders` as the top-level flag.
- Add helper functions for access checks so policies stay fast and readable.

2. Extend backend access rules
- Update CO-related RLS so a collaborator org can read the CO and its children:
  - `change_orders`
  - `co_line_items`
  - `co_labor_entries`
  - `co_material_items`
  - `co_equipment_items`
  - `co_activity`
- Keep write permissions scoped:
  - FC collaborator can add/edit only their own labor/material/equipment rows
  - TC still controls main CO status transitions back to GC
- Use helper functions like `can_access_change_order()` / `is_change_order_collaborator()` to avoid repeating expensive joins.

3. Add a TC action: “Request FC input”
- In `COStatusActions.tsx`, show this only when:
  - user is TC
  - CO was originated upstream from GC (`co.created_by_role === 'GC'`)
  - TC is the active assigned org
  - CO is in a TC-working state (`shared` or `rejected`)
- This opens a small dialog to pick an FC org already on the project team.
- On confirm:
  - create/update collaborator row
  - set `fc_input_needed = true`
  - write activity log
  - notify the FC org

4. Show FC involvement clearly in the detail page
- In `CODetailPage.tsx`, add a small panel like:
  - “Field crew requested”
  - FC org name
  - status: invited / in progress / completed
  - quick link/filter for FC-entered labor
- This makes it obvious the CO is waiting on or includes FC contribution.

5. Make the CO show up for the FC user
- Update `useChangeOrders.ts` to include COs where the current org is an active collaborator.
- Add these to a visible bucket such as:
  - “Shared with me”
  - or a clearer section like “Needs FC input”
- This is required so the FC can actually find the CO from their list, not just through a direct link.

6. Allow FC contribution without changing CO ownership
- Keep the existing line items as the shared scope source.
- FC should be able to:
  - log labor on those line items
  - optionally add notes/material/equipment if allowed by the CO configuration
- TC remains the party that reviews totals and submits upstream to GC.
- This avoids the broken handoff that would happen if `assigned_to_org_id` were switched away from TC.

7. Add an FC completion action
- Add a simple FC button like “Mark FC input complete”.
- This updates the collaborator row to `completed` and logs activity.
- It does not submit the whole CO upstream; it just tells the TC the FC portion is done.
- TC can then continue the normal approval/submission flow.

8. Keep existing FC-originated workflow intact
- Do not remove the current `forward_change_order_to_upstream_gc` path.
- That flow is still valid for FC-originated COs.
- The new collaborator flow should be used only for GC-originated COs where TC needs FC help on the same record.

Technical notes:
- The real blocker is architectural: `assigned_to_org_id` is single-party, so the current model cannot represent “TC owns the response while FC contributes.”
- A collaborator table is cleaner than overloading `assigned_to_org_id` or relying on `parent_co_id`, because it preserves one main CO while allowing multi-org participation.
- If you want a stricter “separate FC sub-CO” model later, we can still build that on top, but for this request the collaborator approach is the best fit with the least workflow confusion.

Files likely involved:
- `supabase/migrations/...` for collaborator table, helper functions, and RLS
- `src/hooks/useChangeOrders.ts`
- `src/hooks/useChangeOrderDetail.ts`
- `src/components/change-orders/COStatusActions.tsx`
- `src/components/change-orders/CODetailPage.tsx`
- likely a new dialog component for selecting the FC org

Expected result:
- A TC viewing a GC-originated CO will have a clear way to involve FC.
- FC will be able to access and contribute to that same CO.
- TC will not lose access or workflow control.
- The GC-facing submission path stays intact and understandable.
