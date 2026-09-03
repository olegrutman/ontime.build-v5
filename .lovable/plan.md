# Supplier Dashboard: Get Into a Project Fast

Today the supplier dashboard opens with a funnel snapshot, cash pipeline, needs-action list, and a metric strip. "My Projects" cards sit far down the page, so on a phone you scroll past 4 large blocks before you can open a project. Below are 5 ways to put project entry front and center. Pick one (or a combo) and I'll build it.

---

## Option 1 — Project Switcher Bar (sticky, top of page)

A single horizontal strip directly under the greeting: current/last project pinned first, the rest as chips, plus a search field. Sticks to the top while scrolling.

```text
┌──────────────────────────────────────────────────────────────┐
│ Good morning, Oleg — ABC Supply            3 active projects │
├──────────────────────────────────────────────────────────────┤
│ ▸ OPEN PROJECT   [ Maple St ✓]  [ 12 Oak ]  [ Ridge Ph2 ]  › │
│                  🔍 search projects…                         │
└──────────────────────────────────────────────────────────────┘
    (sticky — stays visible as you scroll the rest of the page)
```

Best when: few projects, you want one tap from anywhere on the page.

---

## Option 2 — Projects First (reorder + big cards)

Move "My Projects" to the very top as the hero. Each card shows risk pill, Estimate / Ordered / Billed, and the count of things waiting on you. Financial rollups move below.

```text
┌── MY PROJECTS ─────────────────────────── View archive → ────┐
│ ┌───────────────────┐ ┌───────────────────┐ ┌──────────────┐ │
│ │ Maple St Duplex   │ │ 12 Oak Remodel    │ │ Ridge Ph2    │ │
│ │ ● On Track  Resid │ │ ● Over Budget     │ │ ● Watch      │ │
│ │ EST   ORD   BILL  │ │ EST   ORD   BILL  │ │ ...          │ │
│ │ 82k   61k   40k   │ │ 44k   51k   38k   │ │              │ │
│ │ 2 need action  →  │ │ 3 need action  →  │ │ — →          │ │
│ └───────────────────┘ └───────────────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
┌── CASH PIPELINE (moves below) ───────────────────────────────┐
```

Best when: the project is always the starting point of your day.

---

## Option 3 — Left Project Rail (desktop) + top scroller (mobile)

Persistent narrow rail listing every project with a risk dot and AR balance. Click = go to project. On mobile it becomes a single-line horizontal scroller pinned under the header.

```text
┌────────────┬─────────────────────────────────────────────────┐
│ PROJECTS   │  Dashboard content (pipeline, actions, tables)   │
│ ● Maple St │                                                  │
│   AR 12.4k │                                                  │
│ ● 12 Oak   │                                                  │
│   AR  3.1k │                                                  │
│ ● Ridge Ph2│                                                  │
│   AR   —   │                                                  │
│ + archive  │                                                  │
└────────────┴─────────────────────────────────────────────────┘
mobile:  [● Maple St] [● 12 Oak] [● Ridge Ph2]  →  (swipe)
```

Best when: you jump between projects constantly all day.

---

## Option 4 — Make the Snapshot Rows Clickable + "Open" column

Keep today's layout, but every project name in the funnel snapshot, deliveries table, and forecast table becomes an obvious link with an explicit "Open →" button, plus a project filter at the top of each table.

```text
┌── PROJECT BUDGET FORECAST ───────────────────────────────────┐
│ Filter: [ All projects ▾ ]                                    │
│ PROJECT        EST     ORDERED   BILLED   RISK      ACTION    │
│ Maple St ↗     82,000   61,000   40,000   ● Track  [Open →]  │
│ 12 Oak ↗       44,000   51,000   38,000   ● Over   [Open →]  │
└──────────────────────────────────────────────────────────────┘
```

Best when: you don't want the layout to change, just less hunting.

---

## Option 5 — Command Palette + Floating "Go to project" button

A floating action button (bottom-right on mobile, `Cmd/Ctrl-K` on desktop) opens a searchable project list with recent projects on top. Works from any page, not just the dashboard.

```text
   dashboard …                       ┌─────────────────────────┐
                                     │ 🔍 go to project…       │
                                     │─────────────────────────│
                  ╭───────────────╮  │ RECENT                  │
                  │ ⌘K  Go to     │  │ Maple St Duplex   ● 12.4k│
                  │     project   │  │ 12 Oak Remodel    ● 3.1k │
                  ╰───────────────╯  │ ALL                     │
                                     │ Ridge Ph2, Birch Ln …   │
                                     └─────────────────────────┘
```

Best when: many projects and you know the name you want.

---

## My recommendation

**Option 1 + Option 2 together**: a sticky project switcher bar at the very top for one-tap access, and "My Projects" promoted above the financial rollups. That fixes both the "front and center" ask and the deep-scroll problem on mobile without adding new navigation concepts.

## Technical notes

- Changes are confined to `SupplierDashboardView.tsx` plus one new presentation component under `src/components/dashboard/supplier/`; existing data from `useSupplierDashboardData` already carries name, risk, estimate/ordered/billed and AR per project — no query or schema changes.
- Sticky positioning respects the existing app header offset and stays below the `z-40` sidebar layer.
