## What's broken

### 1. Overview shows "−$200K / 0%" projected margin (screen 2)
The project has a TC contract ($200K) but no owner contract. The margin formula is doing `owner − tc = 0 − 200K = −200K`, then labeling it "Awaiting Data" but still rendering the red negative number and a misleading "0%" badge. For a GC who hasn't entered the owner contract yet, the correct state is **neutral "Awaiting owner contract"** — no number, no negative, no 0% pill.

The Owner Budget tile correctly reads "Not Set", but the hero KPI, the Cash Flow tile ("You owe $200K"), and the Trade Contractor Contract tile ("0% your margin") are all computing as if owner revenue = $0, which is wrong. They should either suppress the derived value or show an em-dash with a "set owner contract to calculate" hint, matching the Owner Budget treatment.

### 2. "Framing SOV" is mislabeled on the SOV page (screen 3)
The Owner→GC contract row (the prime contract, `contract_sum = 0` because owner value wasn't entered) is being rendered with the title **"Framing SOV"** — that's a scope-template name leaking into the contract label. It should read **"Owner → GC (Prime Contract)"** with the owner's name when known, mirroring how the second row reads "GC → TC SOV". The $0 value also needs an "Awaiting owner contract value" affordance so the user can set it from here.

### 3. "GC → TC SOV" doesn't name the TC (screen 3)
Second row shows `GC → TC SOV` generically. It should resolve `from_org_id` on the GC→TC contract row and read `GC → Supplier_Test (TC)` or the actual TC org name, matching the labeling rule we already added to the Overview TC Contract card.

### 4. Setup banner still showing after setup completed (screens 2 & 3)
Status pill reads **Setup** in the top-right of both project pages, even though wizard ran, both contracts exist, and SOVs are 100% allocated. The "Define Scope & Details" CTA is gone but the project never advanced to `Active`. `useProjectReadiness` is gating Active on something that's already satisfied (likely "owner contract > 0" — which we made optional for GCs in the last change but didn't update the readiness check).

### 5. Dashboard margin% is nonsense (screen 1)
- Main Street Apartments #33: Owner $5.2M, Sub Cost $200K → shows **+96% margin**. That's `(owner − sub) / owner` treating sub cost as the only cost. With no labor/materials/overhead, every setup-stage project will look like a 95%+ winner.
- Oleg Rutman (Setup): $1.5M owner, $0 sub cost → **+100%**. Meaningless for a project with no scope yet.
- Oleg Rutman (Active): $200K owner, $150K sub cost → **+25%**.

For Setup-status projects the margin% pill should be hidden (or read "—") because the cost side is incomplete. For Active projects the formula needs to include labor/materials, not just sub contracts, or be relabeled "Gross margin vs. subcontracts".

### 6. Portfolio Insights cards (screen 1) double-count the broken project
Same root cause as #1 — the project's $200K shows up as `Paid out to subs $0` and `You owe (unpaid) $0` because cash flow uses invoiced totals (correct), but the per-project tile uses contract sums (wrong, see #1).

---

## Fix plan

### A. Margin & cash KPIs respect "owner contract not set" (screens 1 & 2)
- `useProjectFinancials`: when `upstreamContract.contract_sum === 0` for a GC viewer, return `projectedMargin: null` and `marginPct: null` rather than computing negatives.
- `ProjectHealthHero` / `OverviewSummaryStrip`: when margin is null, render the same em-dash + "Set owner contract to calculate" hint already used by Owner Budget. Drop the red `-$200K` and the "+0%" pill.
- TC Contract KPI: when no owner contract, show "—" for "your margin" with the same hint.
- Cash Flow tile: "You owe" should sum **unpaid invoices**, not contract sum. Audit the source — if it's already invoice-based, the $200K is coming from a draft invoice and should be excluded.
- Dashboard project card margin pill: hide when project status is `setup` OR when `owner_contract_value = 0`.

### B. SOV page contract labels (screen 3)
- `useProjectSOV` (or the SOV list component): replace the SOV `template_name` display with a contract-direction label:
  - Owner→GC row → `Owner → <owner name | "GC">` + subtitle "Prime contract"
  - GC→TC row → `GC → <TC org name>` + subtitle "Trade contract"
- When `contract_sum = 0` on the prime row, render an inline "Set owner contract value" button that opens the same inline editor used on Overview.

### C. Readiness / Setup → Active gate
- `useProjectReadiness`: GC projects should be eligible for Active when (a) at least one downstream contract has `contract_sum > 0` AND (b) SOV is 100% on every existing contract. Drop the implicit "owner contract required" check.
- Either auto-advance status when readiness flips true, or surface an "Activate project" action; today the project is stuck in Setup forever.

### D. Dashboard margin formula sanity (screen 1)
- For `setup`-status projects, hide the margin% pill entirely.
- For `active` projects, label the pill "Sub margin" (not "Margin") until labor/materials are in the formula, OR include `actualCosts` so the number reflects reality. Pick one — recommend the relabel, since adding cost basis is a bigger change.

### E. Verify
After the edits, reload `/project/f9ee2f63-4614-45ad-b969-7811266d6c9a/overview`:
- Hero shows "—" with "Set owner contract" hint, no negative numbers
- SOV page shows "Owner → GC (Prime contract)" and "GC → Supplier_Test (TC)"
- Status pill flips to Active (or shows an Activate button)
- Dashboard card for this project has no `+0%` / `+100%` margin pill

## Out of scope
- Building an actuals-based margin formula (labor + materials + equipment).
- Changing how supplier estimates flow into cash forecasts.
- Re-flowing existing test projects' historical data.
