## Two fixes on CO item card (`src/components/change-orders/COLineItemRow.tsx`)

### 1. Prominent "Add Pricing" CTA

**Today:** A tiny pale-amber pill that just reads "Needs Pricing" sits in the top-right corner. Easy to miss.

**Change:** When the row has no pricing yet AND the viewer can add pricing (`canAddLabor && entryCount === 0`), replace the pill with a real call-to-action button rendered on the right side of the card:

- Solid amber/orange background (`bg-amber-500 hover:bg-amber-600 text-white`), bold text, slight shadow
- Dollar icon + label **"Add pricing"**
- Slightly larger (`px-3 py-1.5 text-xs font-bold rounded-lg`)
- Subtle pulse/ring on first render to draw the eye (`ring-2 ring-amber-300/60`)
- Clicking it stops propagation and opens the row's pricing form (sets `expanded = true` and `formOpen = true`)

Once at least one labor entry exists, it flips to the existing green "Priced" pill (no change there).

### 2. Always show the work description

**Today:** The card renders `cleanDescription` only if it exists, as muted small text directly under the title with no label. On older items where the picker didn't capture a narrative, it shows only the bullet list — and on the user's example item nothing reads like a real description.

**Changes on the card:**
- Render description inside a labeled block: a `0.6rem` uppercase "Description" eyebrow above the body text.
- Use `text-sm text-foreground/80` (not `text-muted-foreground`) so it actually reads.
- Drop the `line-clamp-3` so the full scope is visible on the collapsed card. (Edit popover already supports multi-line editing.)
- If `cleanDescription` is empty but the item has a name, fall back to a single-line "—" placeholder so the section is always visually present.

**Change in the picker so new items always carry a real description** (`src/components/change-orders/picker-v3/PickerShell.tsx`, both insert paths around lines 156 and 299):
- If `item.narrative` is blank when submitting, synthesize one from cause + system + location + work types using the same `buildNarrative` logic that already lives in `StepScopeCombined`. Move that helper into `picker-v3/types.ts` (or a small `narrative.ts`) so PickerShell can import it.
- Description still ends with the `Scope:` bullet list, so users get both the prose and the checklist.

### Out of scope

- No DB schema changes.
- No edits to permissions, totals, margin badges, or the right-hand financial pills.
- No backfill of existing rows; only future submissions get the auto-narrative.

```text
Item card (collapsed)
┌─────────────────────────────────────────────────────────┐
│ (1) New wall framing                  [+ Add pricing]   │  ← bold amber button
│     DESCRIPTION                                         │
│     Demo damaged wall framing in living-room … etc.     │
│     Scope:                                              │
│       • New wall framing                                │
│       • Wall relocation                                 │
│     [Plan Revision] [EA] [📍 Living room]               │
└─────────────────────────────────────────────────────────┘
```
