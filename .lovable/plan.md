

# Fix: "Request FC Hours" Button + FC Visibility

## The Problem

Two connected issues:

1. The amber "Request FC Hours" button in the banner does nothing. It fires action `request_fc`, but `handleAction()` only handles `scroll_scope`, `scroll_materials`, `scroll_pricing`, `scroll_fc`, and `log_hours`. The `request_fc` action falls through to the default case which just scrolls to the top of the page.

2. FC can't see the CO because they're not in `org_id` (TC) or `assigned_to_org_id` (GC), and there are zero collaborator records. This is a downstream consequence of bug #1 — the FC was never added as a collaborator because the button didn't work.

## The Fix

### `CODetailLayout.tsx` — Wire up the `request_fc` action

Add a `case 'request_fc'` to `handleAction()` that:
- If there's exactly one FC org option, automatically call `requestFCInput.mutateAsync(fcOrgOptions[0].id)` and show a success toast
- If there are multiple FC org options, scroll to the sidebar's FC card so the user can pick one
- If there are no FC options, show an info toast ("No field crews on this project")

This connects the banner button to the same RPC (`request_fc_change_order_input`) that the sidebar card already uses.

### Also handle `submit` and `approve`/`reject` actions

While we're here, the banner also has `submit`, `approve`, `reject`, and `close_for_pricing` actions that similarly fall through to the default scroll-to-top. Wire these to the existing mutation functions (`submitCO`, `approveCO`, `rejectCO`) already available in the hook.

## Files Changed
- `src/components/change-orders/CODetailLayout.tsx` — add cases to `handleAction` (~15 lines)

## What stays the same
- Database functions — no changes needed
- RLS policies — no changes needed
- `CONextActionBanner.tsx` — no changes needed
- Once TC clicks "Request FC Hours" and it works, the FC gets added as a collaborator and can see the CO via the existing `can_access_change_order` function

