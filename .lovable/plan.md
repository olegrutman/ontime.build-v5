

# Feature Flags & Subscription Tiers for Organizations

## Plain English Explanation

Right now, every organization on your platform gets access to everything. To prepare for charging different prices, we need a way to control **which features each organization can use**.

Here's how it works:

1. **You define subscription plans** (e.g., Starter, Professional, Enterprise) — each plan includes a set of features.
2. **Each organization gets assigned a plan** — when they sign up or when you manually set it.
3. **Features get locked/unlocked based on the plan** — for example, a Starter org might not get Time & Materials tracking, while Enterprise gets everything.
4. **Platform Owners can override individual features** per organization — so if a customer needs one extra feature, you can flip it on without upgrading their whole plan.

This is the standard SaaS "feature gating" pattern used by platforms like Procore, Buildertrend, and every major SaaS product.

### Proposed Feature Tiers (Construction Industry Standard)

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Projects (limit) | 3 | 25 | Unlimited |
| Team members (limit) | 5 | 25 | Unlimited |
| Schedule / Gantt | Yes | Yes | Yes |
| SOV & Contracts | Yes | Yes | Yes |
| Purchase Orders | No | Yes | Yes |
| Invoicing | No | Yes | Yes |
| Change Orders | No | Yes | Yes |
| Time & Materials | No | No | Yes |
| Returns Tracking | No | No | Yes |
| Supplier Estimates | No | Yes | Yes |
| Custom Reports / Export | No | No | Yes |
| API Access | No | No | Yes |

---

## Technical Plan

### 1. Database — Two new tables + one column on `organizations`

**`subscription_plans` table** — Defines the available plans:
- `id`, `name` (Starter/Professional/Enterprise), `display_name`, `monthly_price`, `annual_price`, `is_active`, `created_at`

**`plan_features` table** — Maps features to plans:
- `id`, `plan_id` (FK → subscription_plans), `feature_key` (e.g., `purchase_orders`, `invoicing`), `enabled` (boolean), `limit_value` (nullable int for numeric limits like max projects)

**`org_feature_overrides` table** — Per-org overrides by platform owner:
- `id`, `organization_id` (FK → organizations), `feature_key`, `enabled`, `limit_value`, `updated_by`, `updated_at`

**Add column to `organizations`:**
- `subscription_plan_id` (FK → subscription_plans, nullable, defaults to Starter)

RLS: Platform users get full CRUD; regular users get SELECT on their own org's effective features via a security-definer function.

### 2. Security-definer function: `get_org_features(org_id)`

Returns the merged feature set: plan defaults + org-specific overrides. This is what the frontend calls to check access.

### 3. New Platform Admin page: `/platform/plans`

A new sidebar link "Plans & Features" visible to Platform Owners/Admins. Contains:
- **Plans tab**: View/edit the 3 plans and which features each includes (grid of toggles)
- **Feature keys list**: All available feature keys with descriptions

### 4. Org Detail page — new "Subscription" card

On the existing `PlatformOrgDetail` page, add a card showing:
- Current plan (dropdown to change)
- Feature overrides (toggle switches to enable/disable individual features beyond their plan)
- Effective features list (merged view)

### 5. Frontend feature gate hook: `useFeatureAccess`

```typescript
useFeatureAccess('purchase_orders') // → { enabled: boolean, limit?: number, loading: boolean }
```

This hook reads the current user's org, fetches effective features, and caches them. Components wrap gated features with this check — showing an "upgrade" badge or locked state when disabled.

### 6. Seed data

Insert the 3 default plans and their feature mappings via migration.

---

## Files to create / modify

| File | Change |
|------|--------|
| Migration SQL | Create `subscription_plans`, `plan_features`, `org_feature_overrides` tables; add `subscription_plan_id` to `organizations`; seed plans; RLS policies; `get_org_features()` function |
| `src/types/subscription.ts` | New — types for plans, features, overrides |
| `src/hooks/useFeatureAccess.ts` | New — hook to check feature access for current org |
| `src/hooks/useOrgFeatures.ts` | New — hook for platform admin to manage org features |
| `src/pages/platform/PlatformPlans.tsx` | New — plans management page |
| `src/pages/platform/PlatformOrgDetail.tsx` | Add subscription card with plan selector + override toggles |
| `src/components/platform/PlatformSidebar.tsx` | Add "Plans & Features" nav item |
| `src/types/platform.ts` | No changes needed (already has `canManageFeatureFlags`) |
| App routing | Add `/platform/plans` route |

No edge functions needed — all reads go through the security-definer function and standard Supabase queries.

