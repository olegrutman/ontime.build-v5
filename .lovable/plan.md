

# Analysis: Scope & Details Page Issues

## Critical Bug Found

### 1. Route ordering — Edit button still broken
**File: `src/App.tsx` (lines 174-177)**

The `/project/:id/contracts` route is placed AFTER the catch-all `/project/:id/:section`. React Router matches top-to-bottom, so navigating to `/project/xxx/contracts` hits the `:section` wildcard first and renders `ProjectHome` instead of `ProjectContractsPage`. Same issue affects `details-wizard`, `scope-wizard`, `change-orders/:coId`, and `edit` — all are after the catch-all.

```text
Current order (broken):
  /project/:id           → ProjectHome
  /project/:id/:section  → ProjectHome  ← catches everything!
  /project/:id/contracts → ProjectContractsPage  ← never reached
  /project/:id/details-wizard → ...  ← never reached
  /project/:id/scope-wizard   → ...  ← never reached
```

**Fix**: Move ALL specific `/project/:id/*` routes BEFORE the catch-all `/project/:id/:section` route.

```text
Fixed order:
  /project/:id                         → ProjectHome
  /project/:id/edit                    → EditProject
  /project/:id/contracts               → ProjectContractsPage
  /project/:id/change-orders/:coId     → CODetailPage
  /project/:id/details-wizard          → ProjectDetailsWizard
  /project/:id/scope-wizard            → ProjectScopeWizard
  /project/:id/:section                → ProjectHome  ← catch-all LAST
```

## Other Findings (all OK)

| Area | Status | Notes |
|------|--------|-------|
| Hooks (useScopeWizard, useProjectProfile, useProjectTypes) | OK | Queries are correct, `enabled` guards present |
| Contract query with org joins | OK | Uses correct FK names for join |
| Team name fallback (`teamOrgNames`) | OK | Falls back to `invited_org_name` |
| Edge function (`generate-project-description`) | OK | LOVABLE_API_KEY check, CORS headers, error handling present |
| `description` column on `projects` | OK | Exists in DB schema |
| Address formatting | OK | Handles JSONB `address` field + `city`/`state`/`zip` |
| `DownstreamContractsCard` | OK | Clean pass-through to `ScopeSplitCard` |
| `ScopeSplitCard` scope assignments | OK | Delete-then-insert pattern, correct queries |
| FC org filtering | OK | Filters by `role === 'Field Crew'` from team data |

## Summary

One fix needed: reorder routes in `src/App.tsx` so specific paths come before the `:section` wildcard. This is why the Edit button on contract cards does nothing — it navigates to the right URL but the wrong component renders.

