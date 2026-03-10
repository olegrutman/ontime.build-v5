

# Subscription & Features System — Bug Report

## Bugs Found

### Bug 1: `useFeatureAccess` is never used anywhere in the app
The `useFeatureAccess` hook exists and is well-designed, but **no component in the entire codebase imports or calls it**. This means the subscription/feature gating system has zero enforcement — every feature is accessible to every organization regardless of plan tier. Schedule/Gantt, Purchase Orders, Invoicing, Change Orders, Daily Logs, etc. are all ungated.

**Impact**: Critical. The entire tiered subscription model is cosmetic — toggling features on/off in the admin panel has no effect on what users can access.

**Fix**: Add `useFeatureAccess('feature_key')` checks to the relevant feature entry points (sidebar nav items, tab renders, page guards) to conditionally render or show upgrade prompts.

### Bug 2: `get_org_features()` SQL — override priority logic is wrong
The SQL uses `DISTINCT ON (COALESCE(o.feature_key, p.feature_key))` with `ORDER BY COALESCE(o.feature_key, p.feature_key)`. `DISTINCT ON` picks the first row per group based on the `ORDER BY`, but the ordering is only by feature_key (alphabetical). There's no guarantee the override row is picked over the plan row. The `COALESCE` on enabled/source happens to work because FULL OUTER JOIN puts NULLs in the non-matching side, but the behavior depends on which row Postgres picks first — it's **non-deterministic** when both plan and override rows exist for the same feature_key.

**Impact**: High. Overrides may silently fail — a platform admin toggles a feature override, but the plan default is returned instead.

**Fix**: Add a secondary ORDER BY column that guarantees overrides rank first, e.g.:
```sql
ORDER BY COALESCE(o.feature_key, p.feature_key),
         CASE WHEN o.feature_key IS NOT NULL THEN 0 ELSE 1 END
```

### Bug 3: `subscription_plans` SELECT RLS only allows `is_active = true`
The non-platform-user SELECT policy on `subscription_plans` is `USING (is_active = true)`. If an org is on a plan that gets deactivated, `get_org_features()` (which is SECURITY DEFINER) still works, but the `useSubscriptionPlans()` hook in the admin panel's plan selector fetches via the JS client — so deactivated plans won't appear in the dropdown, making it impossible to see which plan an org is currently on if that plan was deactivated. Minor but confusing for admin workflows.

### Bug 4: `OrgSubscriptionCard` — `selectedPlanId` state initialization doesn't sync
Line 34: `const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlanId ?? '')`. If the component renders before `currentPlanId` is available (e.g. parent is still loading), the state initializes to `''` and never updates when the prop arrives. The `Select` value on line 94 uses `selectedPlanId || currentPlanId || ''` which masks this partially, but after the user changes the plan and navigates away/back, the dropdown may show the wrong plan.

### Bug 5: `CascadeConfirmDialog` causes forwardRef console warning
The console shows: "Function components cannot be given refs. Attempts to access this ref will fail." from `ScheduleTab`. The `AlertDialog` in `CascadeConfirmDialog.tsx` wraps `AlertDialogContent` which expects a ref-forwarded child. The component itself is fine structurally, but it's being rendered **alongside** another `AlertDialog` for delete confirmation in `ScheduleTab.tsx` (line 25-33 imports), and the `CascadeConfirmDialog` functional component is being passed as a child in a context where a ref is attempted.

**Fix**: Ensure `CascadeConfirmDialog` is not nested inside the delete `AlertDialog` context, or wrap with `forwardRef`.

### Bug 6: No authorization check on `get_org_features()` RPC
The function is `SECURITY DEFINER` with no authorization guard. Any authenticated user can call `get_org_features(any_org_id)` and see the feature configuration of any organization. While feature flags aren't highly sensitive, this leaks business information (which plan an org is on, what features they have).

**Fix**: Add a guard: `IF NOT (user_in_org(auth.uid(), p_org_id) OR is_platform_user(auth.uid())) THEN RAISE EXCEPTION ...`.

## Summary

| # | Bug | Severity |
|---|-----|----------|
| 1 | `useFeatureAccess` never used — features ungated | Critical |
| 2 | SQL DISTINCT ON non-deterministic override priority | High |
| 3 | Deactivated plans invisible in admin dropdown | Low |
| 4 | Plan selector state doesn't sync with async prop | Low |
| 5 | forwardRef console warning on CascadeConfirmDialog | Low |
| 6 | No auth check on `get_org_features()` RPC | Medium |

## Recommended Fix Order

1. Fix the SQL `get_org_features()` DISTINCT ON ordering (Bug 2) + add auth guard (Bug 6) — single migration
2. Wire `useFeatureAccess` into feature entry points across the app (Bug 1) — biggest effort, highest value
3. Fix `OrgSubscriptionCard` state sync (Bug 4) and forwardRef warning (Bug 5) — quick UI fixes

