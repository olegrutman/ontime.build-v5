# Learnings from Ontime Build Pro v3 (Oleg) — CO / WO system

Source: workspace project **Ontime Build Pro v3** (`olegrutman@gmail.com`).
Compared against this project's current CO/WO architecture (see `mem://features/change-orders/co-wo-system-spec`).

---

## 1. Oleg's model in one diagram

```
        ┌─────────── Change Order Request (COR) ────────────┐
GC ──► REQUESTED ──► SENT_TO_TC ──► (TC opens)
                                     │
                                     ├──► SENT_TO_FIELD_CREW ──► HOURS_SUBMITTED
                                     │            (FC enters man-hours + notes)
                                     │
                                     ▼
                                  PRICED_BY_TC  (TC adds labor rate, mat'l, equip, markup)
                                     │
                                     ▼
                                  CONVERTED ──────► Change Order (CO)
                                                      │
                                                      ├─ work_status: STARTED → IN_PROGRESS → COMPLETED
                                                      └─ approval_status: DRAFT → NEEDS_APPROVAL → APPROVED / REJECTED
```

Two distinct entities:

- **`change_order_requests`** — lightweight "is there a change here?" ticket. One row, structured location, scope_type, reason, optional FC man-hours, optional TC pricing. Status machine is request-centric.
- **`change_orders`** — the priced, approvable artifact. Created **only on conversion** from a COR (or directly by TC/GC). Carries `source_cor_id`, `source_cor_ref`, `requested_by_*` so the request lineage stays visible.

Additionally:
- **`change_order_cost_layers`** — per-role rows (`FIELD_CREW`, `TRADE_CONTRACTOR`, `GC`) holding `labor_hours`, `labor_rate`, `labor_cost`, `materials_cost`, `equipment_cost`, `total_cost`. Each upstream role's layer is computed from the layer below + markup.

---

## 2. What's genuinely different from us

| Concern | Oleg | This project |
|---|---|---|
| Origination | COR ticket first, CO later | Wizard creates CO directly; routing decided in wizard |
| Status surface | Two axes on CO: `work_status` × `approval_status` | Single `status` enum (`draft → shared → wip → closed_for_pricing → submitted → approved/rejected/contracted`) |
| Pricing storage | Per-role `cost_layer` row, fixed columns | Free-form `co_labor_entries` + `co_material_items` + `co_equipment_items` keyed by `entered_by_role` |
| Reason / scope_type | First-class enums (`OWNER_REQUEST`, `MISSING_SCOPE`, `DESIGN_CONFLICT`, `DAMAGE_BY_OTHERS` × `RE-FRAME / ADDITION / FIXING / RE-INSTALL / ADJUST`) | We store reason as free text on the line; no taxonomy |
| Location | `StructuredLocationPicker` with INSIDE/OUTSIDE → level → unit → room → custom | Picker-v3 location chips + custom strings |
| Scope items | Plain `line_items (LABOR / MATERIAL / EQUIPMENT)` | Rich picker with cause → work-type → materials/equipment + AI narrative |
| Conversion semantics | COR → CO is an explicit user action (`submit_change_order` RPC) | Status transitions in place; no separate "ticket" lifecycle |
| Hierarchy enforcement | `getSubmitToRole(creatorRole)` (FC→TC→GC) baked into the form | Same hierarchy, enforced via routing + assigned_to_org_id |

---

## 3. Worth borrowing (recommended)

### A. First-class **Reason** taxonomy on COs
Oleg's four reasons (Owner Request / Missing Scope / Design Conflict / Damage by Others) plus our existing scope-type are how GCs actually file & triage. Today our `co_line_items.reason` is a free-text per-line note — easy to lose at the CO level.

**Proposal:** add `change_orders.reason` enum (nullable for legacy). Show it as a colored chip on board cards. Backfill from line-level reasons where possible. **No business logic change** — pure metadata + filter.

### B. Two-axis status on the CO detail page
Splitting **work progress** (Started / In progress / Completed) from **approval** (Draft / Pending / Approved / Rejected) reads more naturally than collapsing into one column. Today users have to infer "work is done but not yet approved" from context.

**Proposal:** keep our single `status` as source of truth for the board, but **render** two badges on `CODetail`:
- *Work status* derived from line completeness + collaborator `completed`.
- *Approval status* derived from `submitted_at / approved_at / rejected_at`.

Zero migration; UI-only.

### C. Explicit "COR ticket" for owner-originated / GC-originated work
Right now a GC asking "can you price re-framing the porch?" still has to create a full CO with routing, scope picker, etc. Oleg's COR is a thin pre-CO ticket: GC writes title + location + reason + scope_type + description, sends to TC, TC may bounce to FC for hours, TC prices, then converts. The CO is born already priced.

**Proposal (bigger):** introduce a `change_order_requests` table behind the `co_v4` flag. New `/change-orders/intake` already exists for AI intake — extend it into a request inbox the GC fills out. TC opens, optionally requests FC hours (we already have FC pricing toggle), then "Convert to CO" instantiates a draft CO populated from the request and links back via `source_cor_id`. This is **additive** — current direct-CO flow stays.

### D. Per-role **cost layer rollup** card
Oleg's `cost_layers` make the FC/TC/GC stack visible at a glance:
```
FC layer:  $4,200  (60 hrs × $70)
TC layer:  $4,200 labor + $1,400 mat'l + $500 equip + 15% mkup = $7,015
GC sees:   $7,015 + GC mgmt fee
```

We already compute this in `useCOFinancialsV2` but scatter it across panels. A single **"Cost stack"** card on the CO detail page (respecting markup-disclosure rules) would make margins legible without inventing new data.

### E. Scope-type chip on board cards
Tiny win: show `RE-FRAME / ADDITION / FIXING / RE-INSTALL / ADJUST` as a colored chip on every CO board card. Today the picker has the data; the board doesn't surface it.

---

## 4. Worth **not** copying

- **Single `line_items` table with LABOR/MATERIAL/EQUIPMENT discriminator.** Our split tables give us better RLS, cleaner indexes, and per-domain markup rules. Don't regress.
- **Submitter-to-recipient `recipient_user_id` per record.** We route at the org level via `assigned_to_org_id` + collaborators; per-user routing leaks PII across membership churn.
- **`StructuredLocationPicker` shape.** Our picker-v3 + chips model is more flexible and matches the project's room/building taxonomy. The schema diverges enough that porting Oleg's component would create a parallel system.
- **`reference_number` as bare integer.** Our `CO-{PROJ}-{CREATOR}-{ASSIGNED}-{NNNN}` carries multi-org context Oleg's `CO-1` cannot.

---

## 5. Proposed phased rollout (gated on `co_v4` flag)

| Phase | Scope | Risk | Effort |
|---|---|---|---|
| **P1 — UI only** | Two-badge status on CODetail (B), scope-type chip on cards (E), cost-stack card (D) | Low — no schema change | S |
| **P2 — Metadata** | Add `change_orders.reason` enum + filter chips on board (A) | Low — additive column + backfill | S–M |
| **P3 — COR ticket** | New `change_order_requests` table + `/intake` inbox + convert-to-CO action (C). Reuses existing AI intake page | Medium — new entity, RLS, notifications, board surface | L |

Each phase ships independently and is reversible by toggling `co_v4`.

---

## 6. Open questions before P3

1. Should COR replace or coexist with the direct-CO wizard? (Oleg only has COR-then-CO; we have direct flows that field-tested teams rely on.)
2. Reason taxonomy — match Oleg's four or extend with our own (e.g. `WEATHER`, `INSPECTION_FAIL`, `SCOPE_GAP`)?
3. Does the GC ever need to see the **FC cost layer**, or do markup-disclosure rules forbid that always? (Affects what the cost-stack card renders for each viewer.)
