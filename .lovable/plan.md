# Make the demo feel real

Two tracks executed together: deeper seed data + demo adapters so every sidebar tab has content instead of empty states.

## Track 1 — Seed data overhaul (`src/data/demoData.ts`)

Replace round demo numbers with realistic, reconciled data spread over a 90-day timeline.

- **Project shell**
  - Real-sounding address, lot size, sqft, permit #, owner name, architect.
  - Cover photo (Unsplash construction image) + GC company logo placeholder.
  - Start date 75 days ago, projected completion 120 days out.
- **Financials that reconcile**
  - Contract $1,847,500 (not $185k — that's a kitchen reno, not a custom home).
  - SOV: 22 line items across 7 phases, weighted per industry standards, sums to 100.00%.
  - Billed-to-date derived from invoices, not hardcoded. Retainage = 10% of billed.
- **Activity volume**
  - 8–12 attention items per role with varied ages (2h, 1d, 3d, 1w).
  - 35+ activity feed entries spread over 90 days (CO approved, PO sent, invoice paid, RFI answered, daily log submitted, photo uploaded).
  - 6 team members with names, titles, avatar initials, phone, email.
  - 4 partner orgs (TC, supplier, architect, inspector).
- **Operational data**
  - 14 days of daily logs (weather, crew count, hours, notes, 2–3 photo refs each).
  - Schedule: 18 Gantt tasks across phases with dependencies, % complete, baseline vs current dates.
  - 6 RFIs (mix of open/answered/closed) with full Q&A threads.
  - 3 backcharges, 2 returns, 4 payment applications (1 paid, 2 approved, 1 pending).

## Track 2 — Demo adapters for empty hooks

Each hook below currently queries Supabase and returns `[]` in demo mode. Add a demo-mode short-circuit that pulls from `useDemoProjectData()` / new store slices.

| Hook | What it feeds |
|---|---|
| `useProjectSchedule.ts` | Schedule tab Gantt |
| `useDailyLog.ts` | Daily Log tab list + detail |
| `useProjectQuickStats.ts` | Overview KPI strip (crew today, open RFIs, etc.) |
| `useFinancialTrends.ts` | Overview trend mini-charts |
| `useOrgTeam.ts` / `usePartnerDirectory.ts` | My Team + Partners tabs |
| `useBackcharges.ts` | Backcharges tab |
| `useProjectRFIs.ts` | RFI list (already partial — finish it) |
| `useNotifications.ts` | Bell icon dropdown (seed 8 demo notifications) |

Pattern: add `if (isDemoMode) return { data: demoSlice, isLoading: false };` at the top of each hook, mirroring how `useProjectFinancials` already does it.

## Track 3 — Visual polish

- **Demo banner**: shrink to a 24px-tall strip; move role pills + Reset/Exit to right side. Less orange, more subtle.
- **Project header**: render the cover photo + logo + owner name so it looks like a real configured project.
- **Numbers formatting**: use `IBM Plex Mono` consistently on all financial figures per design system.

## Out of scope

- No write-enabled CO/PO/Invoice wizards (still next tier).
- No backend/RLS changes.
- No multi-project portfolio (single demo project stays).
- No real photo uploads — placeholder Unsplash URLs only.

## Files touched

- `src/data/demoData.ts` (major expansion, ~500 → ~1500 lines)
- `src/contexts/DemoContext.tsx` (add store slices for schedule, dailyLogs, team, partners, notifications, backcharges)
- `src/hooks/useDemoData.ts` (expose new slices)
- `src/hooks/useProjectSchedule.ts`, `useDailyLog.ts`, `useProjectQuickStats.ts`, `useFinancialTrends.ts`, `useOrgTeam.ts`, `usePartnerDirectory.ts`, `useBackcharges.ts`, `useNotifications.ts` (demo-mode short-circuit)
- `src/components/demo/DemoBanner.tsx` (slimmer style)
- `src/components/project/ProjectHeader.tsx` or equivalent (cover photo + logo)

## Validation

- Walk every sidebar tab as GC, TC, FC, Supplier — no empty states except where intentional (locked features).
- Confirm SOV % billed × contract = invoice total (±$1 rounding).
- Bolt tour still completes without selector misses.
