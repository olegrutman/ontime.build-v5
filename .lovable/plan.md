

# Auto-trigger FC Involvement When TC Selects FC in Work Order Wizard

## Problem
When a TC creates a work order and selects an FC name with "Field crew input needed" toggled on, the wizard only inserts a `change_order_collaborators` row. It never calls the `request_fc_change_order_input` RPC, so the FC is never actually notified or given access to collaborate on the work order.

## Fix
In `src/components/change-orders/wizard/TMWOWizard.tsx`, after the collaborator row is inserted (line 282-290), add a call to `request_fc_change_order_input` RPC with the newly created CO ID and the selected FC org ID. This is the same RPC already used in the CO detail page when a TC manually requests FC input.

### Change in `handleSubmit` (around line 290)
After the existing collaborator insert block, add:
```typescript
await supabase.rpc('request_fc_change_order_input', {
  _co_id: preGeneratedId,
  _fc_org_id: data.fcOrgId,
});
```

This ensures when a TC selects an FC in the wizard, the FC automatically receives the work order and can start collaborating — no extra manual step needed.

## Files to edit
- `src/components/change-orders/wizard/TMWOWizard.tsx` — 1 line addition after line 290

