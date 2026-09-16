# How to test Ontime.Build before publishing

Five layers, cheapest first. Layers 1-3 catch broken numbers and broken
permissions; layers 4-5 catch what only a human eye sees.

---

## 1. The sandbox project and four test logins

One permanent project holds one company of every type, so you can sign in as
each and see exactly what that company sees.

**Project:** `[SANDBOX] Willow Creek Estates — do not delete`
Never delete or rename it — the automated checks point at it by id.

| Sign in as | Email | Company | Sees |
| --- | --- | --- | --- |
| General contractor | `gc@test.com` | GC_Test | owner budget, all subcontractor invoices, change-order approvals |
| Subcontractor | `tc@test.com` | TC_Test | own contract, crew work orders, margins, purchase orders |
| Crew | `fc@test.com` | FC_Test | own work orders and own amounts only |
| Supplier | `supp@test.com` | Supplier_Test | estimates, incoming purchase orders, deliveries |

Contracts in the sandbox: crew bills the subcontractor ($520,000, 5% retainage),
the subcontractor bills the general contractor ($978,400), the supplier bills
the general contractor ($410,000).

---

## 2. The money path (run this on every release)

This is the flow that breaks most often. The sandbox already contains it as a
fixture — work order **WO-SBX-0001, "Rebuild rear deck framing"**:

| Step | Who | Amount |
| --- | --- | --- |
| Crew logs 10 hours at $40 | crew | crew bills the subcontractor **$400** |
| Subcontractor prices 10 hours at $75 | subcontractor | bills the general contractor **$750** |
| Subcontractor's own cost of that crew time | subcontractor, private | **$400** |
| Subcontractor's margin | subcontractor only | **$350** |

Rules this fixture protects:

- The crew never sees $750; the general contractor never sees $400 or $350.
- The crew's billable amount must **not** include internal cost notes.
- The frozen price the subcontractor submitted must match its priced lines.
- Approving the work order raises the contract total by exactly $750.

Then walk it once by hand end to end: crew submits → subcontractor prices and
sends up → general contractor approves → invoice created → invoice approved →
invoice paid. Check the contract total, amount billed, retainage held and net
payable after each step.

---

## 3. Automated checks

**Numbers and rules in code** — `bun run test` (212 checks today). Covers
pricing math, crew workload, retainage, role labels, supplier metrics.

**Live data invariants** — `scripts/sandbox-checks.sql`. Ask Lovable to
"run the sandbox checks"; every row must read PASS. It verifies the four company
types are still on the project, the contract chain is intact, the money-path
amounts are exact, every schedule of values totals 100%, nobody is over-billed,
retainage is configured, and no work order lost the company that raised it.

Run both after any change to pricing, invoicing, change orders or access rules.

---

## 4. Manual checklist per company type

Ten to fifteen screens each, on a phone as well as a laptop.

**General contractor** — dashboard totals; project overview budget and margin;
change-order review and approval; owner billing; subcontractor invoice approval;
schedule of values; team page; notifications; must **not** show subcontractor or
crew margins.

**Subcontractor** — dashboard; contract and schedule of values; crew work orders
inbox; pricing a crew work order; sending it up; purchase orders; invoice from
change orders; margins; must **not** show the general contractor's budget or
supplier pricing when the contractor buys the materials.

**Crew** — work order list showing own amounts; create a work order by voice and
by picking items; log time; submit for pricing; own read-only schedule of values;
invoice own approved work orders; must **not** show quotes, proposals or any
upstream amount.

**Supplier** — project list; submit an estimate; incoming purchase orders;
export purchase orders to spreadsheet and email; deliveries and returns;
materials responsibility banner; must **not** be able to issue purchase orders.

---

## 5. Email and notification spot-check

For each scenario, trigger one send to a real inbox and confirm it arrives:
company invite, project invite, change order submitted / approved / rejected,
work order assigned, invoice submitted / approved / paid, purchase order sent,
estimate submitted / approved, owner external approval link.

Then check the delivery log for failures — ask Lovable for "email failures in
the last 7 days". Also confirm the unsubscribe link in the footer works and that
opting out stops that category but never blocks sign-in email.
