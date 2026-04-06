

# Build GC Project Overview Page

## What I'm Building

A single-project detail page (`GCProjectOverview.tsx`) that a GC sees when clicking into a project. It reuses the exact same KpiCard, Pill, Bar, TRow, THead, WarnItem primitives from the dashboard but scopes everything to one project. Card 2 (TC Contract) is editable with inline edit fields and a save button.

## Page Structure (top to bottom)

1. **Header** — Color dot + project name (Barlow Condensed 1.8rem fw900), phase subtitle with live indicator + status pill, breadcrumb, right-side action buttons (New Order, Export PDF)

2. **8 KPI Cards** in a 4-column grid:
   - Card 1: Owner Budget ($420K)
   - Card 2: TC Contract — EDITABLE ($368K) with inline form fields (pencil-to-edit pattern using useState), save button, margin breakdown table
   - Card 3: Change Orders (+$10.2K)
   - Card 4: Materials Budget ($49.1K)
   - Card 5: Open RFIs (4 Open)
   - Card 6: Invoices Paid ($150K)
   - Card 7: Pending Approval ($18.4K) — single invoice detail with approve/reject buttons
   - Card 8: Work Orders (6 Orders)

3. **Project Timeline Strip** — Pure CSS flex phase bar with green/amber/border colors and current position marker

4. **Warnings Card** — 5 attention items using WarnItem pattern

## Editable Card 2 Implementation

- useState for each editable field (contractor name, value, type, date, scope)
- `editingField` state tracks which field is being edited
- Pencil icon click → show inline input; Enter/blur → confirm; Escape → revert
- Unsaved changes indicator (amber dot) on card footer
- "Save Contract Changes" button → `console.log('save contract', payload)`

## Routing

- Add route `/project/:projectId/overview` in App.tsx (or reuse existing project route)
- For now, the page uses hardcoded const data as specified

## Files

| File | Change |
|------|--------|
| `src/pages/GCProjectOverview.tsx` | **New** — Full page with header, 8 KPI cards, timeline, warnings |
| `src/App.tsx` | Add route for the new page |

### What is NOT changing
- Dashboard views, database, RLS, existing project overview components

