# Teach Sasha to explain everything, everywhere

## Why "Sasha explain" doesn't work today

Three concrete gaps, in order of impact:

1. **Highlight mode is opt-in and undertagged.** `SashaHighlightOverlay` only highlights elements that carry a `data-sasha-card="..."` attribute. Today only ~29 components have it (POCard, InvoiceCard, a few dashboard tiles). Click anywhere else — the project header, KPI tiles, sidebar, tables, banners, the timeline, the SOV grid — and the click silently falls through to `onCancel()`. To the user it looks broken.
2. **Page context is a thin hardcoded string.** `useSashaContext` returns one paragraph per route (e.g. "Project Overview — Shows: attention banner, financial signal cards…"). It contains no live data (no numbers, no statuses, no names), so Sasha can't say "your contract is $383K and you've billed 56%." It also has no entry for many real routes (`/orders`, `/estimates`, `/supplier/*`, `/financials`, CO detail variants, etc.).
3. **The model has no domain index to fall back on.** The edge function's system prompt knows about Work Orders, POs, Invoices, SOV, RFIs, and the project-setup wizard. It does **not** know about Change Orders, T&M, Daily Log, Schedule, Backcharges, Returns, Partner Directory, Estimates, Supplier inventory, Reminders, Financials, or any of the role-specific KPI cards. So even when context is right, Sasha bluffs or refuses on half the app.

There's also a small UX bug worth fixing: `handleClose` resets the conversation on every close, so users who re-open Sasha lose context — making "explain this card, now explain that one" feel disconnected.

## The plan

Three tracks. Track 1 is the user-visible fix; Tracks 2 and 3 make the answers actually accurate.

### Track 1 — Make "Explain this" work on any element

Rewrite `SashaHighlightOverlay.findCardAt` so it no longer requires `data-sasha-card`. New resolution order:

1. Nearest ancestor with `data-sasha-card` (keep existing behavior — gives best label).
2. Nearest ancestor matching a **structural selector list**: `[role="article"]`, `[role="region"]`, `section`, `article`, `[data-card]`, elements with the shared `KpiCard` class signature, shadcn `Card` (detected via the `rounded-lg border bg-card` token combo), `table`, `[role="table"]`, `[data-sidebar]`, `header`, `nav`.
3. Fall back to the smallest ancestor whose `getBoundingClientRect()` area is between 80×40px and 70% of the viewport, skipping pure layout wrappers (no border, no background).

When selected, send a richer prompt to Sasha:

```
Explain this {label} on the {route} page.
Visible heading: "{nearest h1/h2/h3 text}"
Visible content (truncated 600 chars): "{innerText}"
Visible numbers: {extracted $ / % / counts}
```

Plus small UX:
- Show a hint pill (e.g. "Explain Action Required section") that follows the cursor so the user knows the target was detected.
- If the click misses, don't cancel — show a 1-second "Nothing to explain here, try another spot" toast and stay in highlight mode.
- Add a one-time tooltip the first time the user enables the crosshair: "Click any section, card, button, or number."

### Track 2 — Live page context, not static strings

Replace `useSashaContext`'s hand-written paragraph with a two-part context:

**(a) Route descriptor** — keep the existing string as the "what this page is for" baseline, but extend coverage to every route currently missing one (CO detail, `/orders`, `/estimates`, `/supplier/*`, `/financials`, `/rfis/:id`, etc.). Move them into `src/data/sashaRouteIndex.ts` for maintainability.

**(b) Live snapshot** — a small `collectPageSnapshot()` helper that runs when Sasha is opened or a message is sent. It walks `<main>` and extracts:
- All visible headings (h1–h3)
- All elements tagged with `data-sasha-card` plus their innerText (truncated)
- All currency / percentage / count tokens via regex (`/\$[\d,.]+[KMB]?|\d+(\.\d+)?%|\b\d+ (items?|invoices?|COs?|POs?|RFIs?)\b/g`)
- Active role + project name from `DemoContext` / `useProjectProfile`
- The currently active tab/section

Snapshot is capped at ~2KB and sent as a separate `pageSnapshot` field on the request. The edge function appends it to the system message under a `## What the user sees right now` heading. This is what lets Sasha say "your $383K contract" instead of "your contract."

### Track 3 — Give the model a real feature index

Create `supabase/functions/sasha-guide/knowledge.ts` exporting a structured catalog of every feature area in the app: Change Orders (lifecycle, pricing modes, NTE), T&M Work Orders, Daily Log, Schedule, Backcharges, Returns, Estimates, Supplier inventory, Reminders, Partner Directory, Financials, role-based markup visibility, the setup wizard, etc. Each entry has:

```
{ id, name, oneLiner, whoUsesIt, keySteps[], commonQuestions[], navHints[] }
```

The edge function injects only the relevant slice based on the route descriptor (e.g. on `/project/.../change-orders`, prepend the Change Orders + Pricing Modes entries). This keeps the system prompt small but accurate. The current monolithic prompt is reduced to: persona + rules + JSON format + the route-relevant slice + live snapshot.

Also: extend the navigation-action regex in `SashaBubble.handleAction` to cover Schedule, Daily Log, Backcharges, Returns, Estimates, Materials/Orders, Financials, Partners — so action buttons Sasha emits actually navigate instead of falling through to chat.

### Small fixes bundled in

- `handleClose` no longer resets `messages` to the greeting; keep history until the user explicitly clicks a "Reset chat" item in the header menu.
- The 30+ route branches in `useSashaContext` move to a typed map (`Record<RoutePattern, RouteDescriptor>`) so adding a new page is one line, not a new `if` branch.
- Add `data-sasha-card="Project Header"` / `"KPI Card"` / `"Sidebar"` / `"Action Required"` to the ~15 highest-traffic containers that don't have it yet. Track 1 makes this optional, but explicit labels give the LLM cleaner prompts.

## Out of scope

- No model swap, no streaming protocol change.
- No screenshot-to-vision pipeline (text snapshot is enough and far cheaper).
- No persisted Sasha history across sessions — just within a session.
- No changes to the demo banner or Bolt guided tour.

## Files touched

- `src/components/sasha/SashaHighlightOverlay.tsx` — new resolver, hover hint, miss-tolerant click.
- `src/components/sasha/SashaBubble.tsx` — keep messages on close, expanded nav router, send `pageSnapshot`.
- `src/hooks/useSashaContext.ts` — slim wrapper around the new route index + snapshot collector.
- `src/data/sashaRouteIndex.ts` *(new)* — full route → descriptor map.
- `src/lib/sashaPageSnapshot.ts` *(new)* — DOM walker that extracts headings, cards, numbers.
- `supabase/functions/sasha-guide/index.ts` — slimmer prompt, route-aware knowledge injection, accepts `pageSnapshot`.
- `supabase/functions/sasha-guide/knowledge.ts` *(new)* — structured feature catalog.
- ~15 high-traffic components — add `data-sasha-card` labels.

## How we'll know it works

Walk the app as GC and as TC and click crosshair → random element on: Dashboard, Project Overview, Change Orders list, a CO detail, SOV, Invoices, Daily Log, Schedule, Financials, Partner Directory. Every click should produce an explanation that names what was clicked and references at least one real number or status from the page. No silent cancels.
