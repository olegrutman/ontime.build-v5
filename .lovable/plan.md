

# CO Flow — My Understanding Back to You

Before any code is written, here is exactly how I understood your entire specification, step by step. Please confirm or correct.

---

## FLOW 1 — GC Creates a CO (Standard or NTE)

1. **GC opens the wizard** → selects project, CO type (T&M or NTE), description, initial line items. Saves as **draft**.
2. **GC submits** → CO status moves to a "Work in Progress" state. It **automatically appears on TC's dashboard** — no accept/decline step. TC is the assigned party.
3. **TC can invite FC(s)** at any time. FC sees only their own scope. FC never sees TC's pricing or GC's numbers.
4. **GC can add new line items or update scope at any time** throughout the CO lifecycle. Every addition triggers a notification to TC (and to any FC on the CO).
5. **GC clicks "Close CO for Final Pricing"** → this is a new explicit action (not currently in the system). It sends a notification to TC and any FC.
6. **TC submits final pricing. FC submits final pricing independently.** Both submit against their own scope.
7. **Once all parties have submitted** (TC always, FC if invited), the CO moves to **Final Approval** with GC.
8. **GC reviews and approves.**
9. **After approval** → TC can invoice GC against the CO. FC can invoice TC against the CO.

### NTE additions:
- NTE cap set at creation.
- Running totals tracked in real time.
- **At 80%**: automated warning notification to all parties.
- **At 100%**: system **blocks** further additions. Alert sent to GC, TC, FC. GC must either increase the NTE or close the CO at current value.

---

## FLOW 2 — TC Creates a CO (Fixed Price)

1. **TC creates CO** with description, fixed price (lump sum or hours x rate), optional duration.
2. **TC submits to GC** for approval.
3. **GC approves or rejects.**
   - Rejected: returns to TC with comments. TC revises and resubmits.
   - Approved: CO is locked at the approved price.
4. **TC executes work.** When done, TC marks CO as **"Completed."** (This is a new status — not currently in the system.)
5. **GC receives notification** of completion. GC must **acknowledge** completion before TC can invoice. (This is a new gating step.)
6. **After GC acknowledges** → TC can invoice. FC (if involved) can invoice TC.

---

## TC Account Settings — Pricing Defaults

The `org_settings` table already has `default_hourly_rate` and `labor_markup_percent`. What's **new**:

- **A new boolean column** (e.g. `use_fc_input_as_base`) on `org_settings` — the account-level default toggle.
  - If **ON**: every new CO that TC opens with FC involvement starts with the per-CO toggle pre-set to ON.
  - If **OFF**: every new CO starts with the toggle OFF; TC prices manually.

---

## Per-CO Toggle — "Use FC Input as My Pricing Base"

A **new boolean column** on `change_orders` (e.g. `use_fc_pricing_base`). Appears in TC's view whenever FC has been invited and has submitted input. Overrides account default for that specific CO only.

### IF TOGGLE ON — HOURLY:
- TC's price to GC = FC's submitted hours × TC's `default_hourly_rate` (from org_settings at time of calculation).
- Example: FC submits 10 hrs. TC's rate is $95/hr. → TC bills GC **$950**.
- FC's own rate and what TC actually pays FC is tracked separately, never shown to GC or FC.

### IF TOGGLE ON — LUMP SUM:
- TC's price to GC = FC's submitted lump sum × (1 + TC's `labor_markup_percent`).
- Example: FC submits $1,000. TC margin is 25%. → TC bills GC **$1,250**.
- Margin % never visible to FC or GC.

### IF TOGGLE OFF:
- TC enters pricing manually. FC's numbers are visible to TC as cost reference only.

### Retroactivity:
- Changes to TC's rate or margin in account settings **do not** retroactively change already-submitted or approved COs. They only affect new COs going forward. This means the calculated price is **snapshotted** at the time TC submits/generates pricing, not dynamically recalculated.

---

## Visibility Rules (What Each Role Sees)

| Data | GC sees | TC sees | FC sees |
|------|---------|---------|---------|
| TC's final price to GC | Yes | Yes | No |
| FC's hours/lump sum | No | Yes (as cost) | Yes (own) |
| TC's hourly rate | No | Yes (own) | No |
| TC's margin % | No | Yes (own) | No |
| Material pricing | Yes if responsible; otherwise only if GC is responsible | Yes if TC is responsible; No if GC is responsible | Never |
| Equipment pricing | Same as materials | Same as materials | Never |

---

## Materials & Equipment Visibility
- Any party can **add** materials/equipment to a CO.
- FC can add but **cannot see pricing**.
- Responsibility is set **per line item** at entry time.
- If TC is responsible → TC sees pricing, FC doesn't.
- If TC is NOT responsible → only GC sees pricing. TC doesn't see it either.
- Same rules for equipment.

**My assumption**: The current `materials_responsible` / `equipment_responsible` field is per-CO, not per-line-item. Your spec says "per line item at entry time." This means I need to add a `responsible_party` column to `co_material_items` and `co_equipment_items` tables, and visibility logic checks that column per row.

---

## Invoicing Chain
- FC invoices TC. TC invoices GC. FC **never** invoices GC.
- No party can invoice until: (a) CO is **Final Approved**, and (b) the **completion acknowledgment** step is satisfied (for Flow 2).

---

## What's New vs. What Exists

| Feature | Current state | Needed |
|---------|--------------|--------|
| CO statuses | draft, shared, submitted, approved, rejected, contracted | Add: **work_in_progress**, **closed_for_pricing**, **completed**, **completion_acknowledged** |
| "Close CO for Final Pricing" action | Does not exist | New GC action |
| "Mark Completed" action | Does not exist | New TC action |
| "Acknowledge Completion" action | Does not exist | New GC action |
| Per-CO toggle `use_fc_pricing_base` | Does not exist | New column on `change_orders` |
| Account default `use_fc_input_as_base` | Does not exist | New column on `org_settings` |
| TC auto-pricing from FC input | Does not exist | New calculation logic in TC's pricing view |
| NTE 80% warning notification | Partially exists (UI banner at 80%) | Need automated notification trigger |
| NTE 100% hard block | Partially exists (UI warning at 95%) | Need hard block at 100% + notification |
| Material/equipment responsibility per line item | Per-CO only | Need per-line-item column |
| GC can add scope to live CO | Not restricted but no notification | Need notification on scope additions |

---

## Ambiguities / Assumptions I Need You to Confirm

1. **"Work in Progress" status**: You described that when GC submits, it "automatically appears on TC's dashboard as Work in Progress." Is this a distinct DB status (`work_in_progress`), or is the current `shared` status sufficient with a UI label change?

2. **"Close CO for Final Pricing"**: Is this a new status (e.g. `closed_for_pricing`) or an action that sets a flag while the CO remains in `submitted` status?

3. **"Completed" and "Acknowledged"**: Are these two new statuses in the lifecycle, or flags on the existing `approved` status?

4. **NTE 100% block**: Should this be a hard DB-level block (trigger that prevents INSERT on labor entries when total >= cap), or a UI-level block that the frontend enforces?

5. **TC auto-pricing snapshot**: When the toggle is ON, at what moment is TC's price to GC calculated and locked? At TC's submission time? Or is it a live calculation that only locks when the CO is approved?

6. **Material responsibility per line item vs per CO**: You said "per line item at entry time." The current schema has it per CO. Confirming you want a `responsible_party` column on each material/equipment row.

7. **FC can create COs?**: Your flows only mention GC-created (Flow 1) and TC-created (Flow 2). The current system allows FC to create COs. Should FC creation be removed, or is it an implicit third flow?

---

I will not write any code until you confirm my understanding is correct and clarify the ambiguities above.

