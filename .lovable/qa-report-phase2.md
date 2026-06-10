# Phase 2 QA Audit — Bug Report
_Date: 2026-06-10 · Test env: shared sandbox · Roles tested: GC (live preview), TC/FC/Supplier/Platform (static + DB)_

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

---

## 🔴 CRITICAL

### C1. GC project card double-counts revenue, displays bogus margin
**Where:** `src/hooks/useDashboardData.ts` lines 854–858, rendered by `RichProjectCard` via `MyProjectsHero`.
**Repro:** Log in as `gc@test.com` → /dashboard → look at "Oleg Rutman" card.
**Observed:** OWNER CONTRACT $350K · MARGIN $200K (+57%) · SUBS COST $150K.
**Expected:** OWNER CONTRACT $200K · MARGIN $50K (+25%) · SUBS COST $150K (matches the Portfolio Insights cards below, which are correct).
**Root cause:** When `orgType==='GC'` the code iterates *every* contract with `to_org_id===GC` and does:
```ts
pf.revenue += owner_contract_value || c.contract_sum;
pf.costs   += c.contract_sum;
```
Both the owner-funded leg (contract_sum=0, owner_contract_value=200000) *and* the TC sub leg (contract_sum=150000) match this filter, so revenue gets `200000 + 150000 = 350000` and costs get `0 + 150000 = 150000`.
Should only add `owner_contract_value` from the owner leg, and only `contract_sum` from sub legs.

### C2. project_contracts row directions are written with wrong `from_role`
**Where:** Setup wizard / contract persistence — the owner→GC leg is being saved with `from_role='Trade Contractor'`, `to_role='General Contractor'` instead of `from_role='Owner'`.
**Repro:** `SELECT from_role, to_role, contract_sum, owner_contract_value FROM project_contracts WHERE project_id='c3069f90-…';` returns two rows both labeled `Trade Contractor → General Contractor`.
**Impact:** breaks every query that filters by role direction (financial trends, invoice routing, billing privacy). Also amplifies C1.
**Fix:** Setup wizard's contract-create path must set `from_role='Owner', from_org_id=NULL` for the GC's owner leg.

### C3. `purchase_orders.project_id` is nullable
**Where:** schema — only remaining nullable identity column from the Phase 1 sweep.
**Impact:** PO RLS policies depend on join to project; orphan POs become invisible/unreachable and break aggregate cost rollups.
**Fix:** `ALTER TABLE purchase_orders ALTER COLUMN project_id SET NOT NULL` (after backfill check).

---

## 🟠 HIGH

### H1. 128 `.single()` calls throw on missing rows
**Where:** `useChangeOrderDetail` (10), `useContractSOV` (8), `useProfile` (6), `generateCONumber.ts` (3), `useProjectReadiness`, `useProjectSchedule`, `useCORoleContext`, etc.
**Impact:** Any race / missing data renders an unhandled rejection → blank screen or red toast. Particularly bad in `generateCONumber` (org/project rename in flight = CO creation fails). Already proven in earlier sessions ("XXX" prefix fallback).
**Fix:** Convert to `.maybeSingle()` and defend the `null` path. Highest-priority files: `generateCONumber.ts`, `useProjectReadiness.ts`, `useCORoleContext.ts`, `useChangeOrderDetail.ts`.

### H2. 267 Supabase linter warnings, mostly SECURITY DEFINER reachable via `anon`
Phase 1 revoked some — sweep remaining ones (Public Bucket Listing on 2 buckets, extension in public, permissive RLS policies on a handful of tables).

### H3. `project_team.user_id` & `org_id` nullable + `status='active'` rows can have NULL user_id
Currently 0 such rows, but invite flow can write them. RLS on `project_participants` derives from this and silently drops rows where user_id is NULL ⇒ user appears to lose project access after invite acceptance race.
**Fix:** Add CHECK constraint `(status='invited') OR (user_id IS NOT NULL AND org_id IS NOT NULL)`.

### H4. SOV residue absorption still missing in `generate-sov` edge function
Phase 1 corrected the 2 invalid SOVs by hand. Without code fix, the next AI-generated SOV will reintroduce ±0.01% drift, which trips the SOV-lock validator silently. **Fix:** force the last item to absorb `100 - sum(previous)` before insert.

### H5. `coNumber` falls back to literal `'XXX'`/`'XX'` prefixes
**Where:** `src/lib/generateCONumber.ts` lines 4–11.
**Impact:** Renamed orgs or orgs with single-char names produce ugly/duplicate CO numbers (`CO-XXX-XX-XX-0001`) and collide across projects.
**Fix:** Fall back to org/project ID slice, not literal "XX".

### H6. Anonymous sign-up endpoint usable on root domain
`supabase.auth.signInAnonymously` is not called in code, but the gateway is open. Confirm `anonymous_signins_enabled=false` in auth config (Phase 1 didn't verify).

---

## 🟡 MEDIUM

| # | Where | Issue |
|---|---|---|
| M1 | `useAuth.tsx` line 87–92 | `setTimeout(..., 0)` to fetch user data races with route guards; on slow networks `loading=true` flashes the auth wall for half a second. |
| M2 | `RequirePlatformRole.tsx` | Redirect uses `window.location.href` (full reload) instead of `<Navigate>` — drops in-flight QueryClient cache. |
| M3 | `useFeatureAccess.ts` | `enabled: isLoading ? true` opens every feature gate during load — momentary access to gated UI before lockout. Default-deny would be safer. |
| M4 | `useCORoleContext.ts` 47 | `.single()` inside React-Query (no `.maybeSingle()`) — see H1. |
| M5 | 217 hardcoded role-string checks (`'GC' \| 'TC' \| 'FC'`) | Brittle; should use central `useOrgType()` helper. |
| M6 | `useDashboardData.ts` `paidByYou`/`paidToYou` 871–880 | Only counts `PAID` — `APPROVED` invoices not reflected, so "Cash position" lags reality. |
| M7 | Console: persistent React Router v7 deprecation warnings on every navigation. Opt-in to `v7_startTransition` + `v7_relativeSplatPath`. |

## ⚪ LOW

- L1: Dashboard banner text "Healthy 25% projected margin" hard-codes "Healthy" regardless of actual %.
- L2: `MyProjectsHero` "New Project" button duplicates the global header CTA.
- L3: `SupplierDashboard` skeleton uses `h-24/h-40/h-64` but the real layout is taller — visible jump on first paint.
- L4: `RichProjectCard` health pill uses `paidToYou` as `cashPosition` (positive bias).
- L5: Many `src/_archive/*` and `_archived/*` files still bundled into the import graph (no tree-shake guard).

---

## Coverage notes
- Live UI test was limited to GC dashboard (1 turn) — found C1/C2 immediately, so I pivoted to static+DB sweep, which surfaces issues faster than clicking through every role.
- T&M / Work Order flow, supplier-pricing-privacy edge cases, and Platform admin 2FA flow were code-reviewed only (no live mutations).
- Recommend a follow-up live pass for: CO approval lifecycle (apply_co_contract_delta trigger), Invoice → SOV decrement, PO → Receive → Invoice loop, FC pricing toggle.

---
Next: fix C1, C2, C3, H1 (top files), H4, H5 in code; re-test the GC dashboard card; defer M/L to user prioritization.
