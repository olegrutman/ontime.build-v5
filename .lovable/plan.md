

# Show Pending Invite Names in Setup Readiness Card

## What Changes

Instead of the generic label "All invites accepted", the checklist will show **which specific organizations** still have pending invites. For example:

- "All invites accepted" (when complete)
- "Awaiting acceptance: ABC Framing, XYZ Electric" (when incomplete)

## Technical Changes

### 1. `src/hooks/useProjectReadiness.ts`

**Update the participants query** to join organization names:

```
supabase
  .from('project_participants')
  .select('id, role, invite_status, organizations:organization_id(name)')
  .eq('project_id', projectId)
```

**Build a dynamic label** for the `accepted` checklist item:

- If all accepted: label = `"All invites accepted"`
- If some pending: label = `"Awaiting: CompanyA, CompanyB"` (list the org names with non-ACCEPTED status)

### 2. `src/components/project/ProjectReadinessCard.tsx`

No structural changes needed -- it already renders `item.label` dynamically. The improved label from the hook will display automatically.

## Result

The readiness card will clearly tell the user **who** hasn't accepted yet, so they know exactly which team members to follow up with.

