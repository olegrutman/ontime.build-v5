
# Overnight Autonomous Fix Plan

**Honest answer up front:** I can safely fix roughly **60–70%** of PROBLEMS.md on my own tonight. The rest needs your judgment (product copy, design decisions, backend policy, real testing with users). I'll fix what's safe, leave the rest documented, and give you a report in the morning.

---

## What I WILL fix on my own (safe, mechanical, no judgment calls)

### Wave 1 — Blockers that are pure bugs
- Remove the "UI preview only" label from the phone signup tab in production.
- Fix Google sign-in redirect to point at `/auth/callback` instead of site root.
- Remove the broken phone-signup path entirely (or hide it behind a feature flag) so no more `phone-placeholder@ontime.build` users get created.
- Fix the OTP length mismatch (6 vs 8 digits).
- Fix the "I'm part of a team" toggle inversion on GC signup.
- Remove hardcoded mock data ("5 Cherry Hills Park", "Derek Kowalski") from `GCProjectOverview.tsx` — replace with real data hooks or an empty state.
- Add confirm dialogs to all destructive actions currently using browser `confirm()` or firing immediately (Approve $18,400, Clear QA data, PO deletes, Supplier delete, etc.) — replace with the existing shadcn `AlertDialog`.
- Fix Cash Position formula on FC dashboard (`totalPaid - payables`, not `totalPaid - 0`).
- Fix "Pending CO net at risk" to filter out FC-irrelevant COs.
- Fix `FS` role bypassing FC guard.
- Fix `TC_PM` default `canApprove` (align with role spec).
- Add org filter to Supplier estimates/projects queries (data leak).
- Add org filter to TC gross margin visibility.
- Wire the orphaned `ProjectSOVPage.tsx` route or remove the file.
- Remove the duplicate Supplier estimate page.
- Add role gate to desktop Quick Capture fallback.

### Wave 2 — Embarrassing UI polish
- Wrap sign-in inputs in a `<form>` so Enter works from the email field.
- Add "Resend verification" button to the unconfirmed-email error state.
- Fix "Go back" navigation to use browser history instead of always `/signup`.
- Add `inputMode="decimal"` to all mobile numeric inputs.
- Add `aria-label`s to the 45 flagged unlabeled controls.
- Remove the 10 `console.log(...)` dead row-click handlers on GC Dashboard (either wire them to detail routes or remove the click affordance).
- Remove/disable dead buttons: "Delete Account", "Submit to TC" raw enum, "New Order" flow for suppliers.

### Wave 3 — Design system cleanup (mechanical)
- Sweep the ~380 hardcoded color classes (`text-white`, `bg-black`, `bg-[#...]`) and replace with semantic tokens from `index.css`.
- Sweep the ~100+ inline `style={{ color: '#...' }}` objects on Supplier and GC Project Overview and move to tokens.
- Standardize "Ontime.Build" vs "OnTime.Build" — pick "Ontime.Build" (matches BrandPanel).
- Fix hardcoded canonical URL to use `window.location.origin`.

### Wave 4 — Loading + empty states (mechanical)
- Add `Skeleton` loading state to the 38 pages missing one — I'll use the existing `Skeleton` component and match the page layout.
- Add empty states to the pages missing them, following the pattern already in `SupplierDashboard`.

### Wave 5 — Security hardening
- Move impersonation token from `sessionStorage` to httpOnly cookie flow OR shortest fix: encrypted + short TTL + tab-close cleanup.
- Ensure the "You are impersonating" banner renders inside project routes (move to `AppLayout`).
- Add server-side check for platform admin routes (not just client 2FA gate) via edge function.

---

## What I will NOT fix (needs your call)

- **Landing copy** — "200+ construction teams", "60 seconds", tagline honesty. That's marketing, not engineering. I'll leave a comment.
- **Two parallel signup flows** — merging `/auth` register tab and `/signup` wizard is a product decision. I'll leave both and flag the conflict.
- **Platform permission toggles without backend enforcement** — needs new RLS policies I shouldn't write without you reviewing.
- **FC picker** — new feature, needs spec.
- **Focus traps on 100+ custom bottom sheets** — risky mechanical change, could break interactions. I'll do the top 10 most-used sheets only.
- **Returns pricing panel corruption loop** — needs reproduction with real data; I'll investigate but may not ship a fix.

---

## Safety rules I'll follow
- Every change goes through the file-edit tools (no destructive shell).
- I won't touch: `auth` schema, `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml`.
- Any DB migration I write will be minimal and reversible; if a fix requires a large schema change, I'll skip and log it.
- After each wave I'll run `tsgo` typecheck and `bunx vitest run`. If either breaks, I revert that wave's changes and move on.
- I'll commit progress by leaving a running log at `.lovable/overnight-log.md`.

## What you'll see in the morning
1. `.lovable/overnight-log.md` — every fix I shipped, every fix I skipped and why.
2. Updated `PROBLEMS.md` — items I fixed marked `[FIXED]`, items I skipped marked `[NEEDS YOU]` with the reason.
3. A short summary message from me listing anything that broke or anything I wasn't sure about.

## Rough time/scope
About 40–60 tool turns of work. I'll stop early if I hit repeated failures rather than thrash.

---

**Approve this plan and I'll start immediately. Sleep well.**
