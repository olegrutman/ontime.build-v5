## You're right — and here's how I read it back

Today the wizard does two things wrong:

1. **CO title bakes in the "why"** (intent + date), e.g. `CO-MAI-GC-TC-0008 · Tear out / demo · Apr 26, 2026`. That label is wrong the moment the CO contains items that aren't tear-out (look at your screenshot — items 2 and 3 are housewrap/WRB repair, not demo).
2. **Description is one CO-wide blob** (`reason_note`), generated once at review time. Individual line items either show no description or just a fragment of the QA answer. The user can't read a line and understand "what is this and why is it here."

We agree on the model: **a CO is a container; each line item carries its own why / where / what.** The wizard answers are inputs that produce items — they should not name the CO.

## The fix

### 1. CO title: neutral + identifying, no intent

Format becomes one of:
- `CO-MAI-GC-TC-0008 · Apr 26, 2026` (default)
- `CO-MAI-GC-TC-0008 · {user-typed name}` (if they enter one in the wizard)

We add an optional **"Name this change order (optional)"** input on the Review step. No "why" string in the title — ever.

### 2. Each line item gets its own why / where / what

`co_line_items` already has `reason`, `location_tag`, and `description` columns — we're just under-using them. Per item we will persist:

- `reason` — the why (already wired, but currently inherits one CO-wide value; will become per-item editable, defaulting to the wizard's "why")
- `location_tag` — the where (already wired the same way; same treatment)
- `description` — a 1–2 sentence, item-specific summary built from: item name + intent + component + location + the QA answers that produced *this* item

The detail page already renders `item.item_name`, `cleanDescription`, the reason chip, and the location chip on each row (`COLineItemRow.tsx` lines 122–149) — so the UI work is minimal once the data is right.

### 3. Per-item AI descriptions (replaces the one big blob)

Rework `generate-work-order-description` (or add a sibling `generate-line-item-description`) so it returns **an array of `{ item_id, description }` keyed to each selected catalog item**, not one paragraph for the whole CO.

Inputs per item: catalog item name + unit, the resolved intent for that item, the resolved zone/component, the QA answers tagged to that item, and the project context. Output: 1–2 sentence description following the existing "AI scope description style" memory (no invented quantities, derived strictly from selections).

The CO-level `reason_note` becomes optional / removed from the header — replaced by the per-item descriptions.

### 4. Where the wizard answers actually go

```text
Wizard answer            →  Lives on
─────────────────────────────────────────────
why (intent/reason)      →  co_line_items.reason       (per item)
where (location/zone)    →  co_line_items.location_tag (per item)
what kind (QA answers)   →  co_line_items.description  (per item, AI-summarized)
optional CO name         →  change_orders.title        (just the name, no intent)
```

The CO header will only show: number, optional name, date, status. No intent string.

## Technical changes

**`src/components/change-orders/wizard/COWizard.tsx`**
- Line ~398: drop `intentLabel` from `title`. Use `${coNumber} · ${data.coName || format(...)}`.
- Add an optional `coName` text input to the Review step (Step 5).
- Line ~432–450: when inserting `co_line_items`, pull per-item description from the new AI response keyed by item id, not from `data.aiDescription`. Keep `reason` and `location_tag` as defaults from the wizard but allow per-item override (next step).

**`supabase/functions/generate-work-order-description/index.ts`**
- Change response shape from `{ description: string }` to `{ items: Array<{ item_id, description }>, summary?: string }`.
- Prompt change: generate one short description per selected item, grounded in that item's resolved component, intent, location, and matching QA answers. Follow `mem://features/ai-scope-description-style` (1–2 sentences, no invented quantities).

**`src/components/change-orders/wizard/StepReview.tsx` (and the inline review block in COWizard)**
- Show per-item draft descriptions with inline edit, instead of one big textarea.
- Add the optional "Name this change order" input above the list.

**`src/components/change-orders/COLineItemRow.tsx`**
- Already renders `cleanDescription`, `reason` chip, and `location_tag` chip — no structural change. Verify the new per-item description is what's stored in `co_line_items.description`.

**Detail page header (`CODetail.tsx` / `COHeroBlock.tsx`)**
- Remove the "Tear out / demo" subtitle line that mirrors the title. The intent is no longer a CO-level concept.

**No DB migration needed** — `co_line_items.reason`, `location_tag`, `description` already exist.

## What this looks like after

Header: `CO-MAI-GC-TC-0008 · Apr 26, 2026` (or `· Roof tear-out + WRB repair` if user named it)

Items each show their own line, e.g.:
- **Selective demolition** — *Tear out roof sheathing over east elevation rafters; haul-off included.* `Addition` `Exterior · Roof system / Roof sheathing · Roof`
- **Housewrap repair / patch** — *Patch torn WRB on east wall around damaged sheathing; tape all seams per mfr.* `GC request` `Exterior · Wall (exterior) / WRB / housewrap · East elevation`
- **WRB seam tape** — *Tape WRB laps after patch to restore drainage plane continuity.* `GC request` `Exterior · Wall (exterior) / WRB / housewrap · East elevation`

Three items, three reasons, three locations, three descriptions. One CO.

## Out of scope (call out if you want them in)

- Per-item editing of `reason` and `location_tag` *after* CO creation (in the detail page) — currently only editable through the wizard. Easy follow-up if you want it.
- Backfilling existing COs' titles/descriptions.
